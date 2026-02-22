import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Client as PgClient } from 'https://deno.land/x/postgres@v0.19.3/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HIGH_VOLUME_TABLES = [
  'conversations', 'conversation_messages', 'contacts',
  'instance_connection_logs', 'scheduled_message_logs',
  'shift_report_logs', 'broadcast_logs',
]

async function execOnExternal(pgClient: PgClient, sql: string): Promise<{ success: boolean; error?: string }> {
  try {
    await pgClient.queryArray(sql)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

async function execMultiOnExternal(pgClient: PgClient, statements: string[], detailLabels?: string[]): Promise<{ success: number; failed: number; errors: string[]; details: string[] }> {
  let success = 0, failed = 0
  const errors: string[] = []
  const details: string[] = []
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    if (!stmt.trim()) continue
    const r = await execOnExternal(pgClient, stmt)
    const label = detailLabels?.[i] || `Statement ${i + 1}`
    if (r.success) {
      success++
      details.push(`✓ ${label}`)
    } else {
      failed++
      errors.push(r.error || 'Unknown error')
      details.push(`✗ ${label}: ${r.error}`)
    }
  }
  return { success, failed, errors, details }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const pureAdminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: roleData } = await adminClient
      .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'super_admin').maybeSingle()
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: Super Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const { action, external_db_url, external_url, external_service_role_key } = body

    // ─── Test Connection ───────────────────────────────────────────────
    if (action === 'test-connection') {
      if (!external_db_url) throw new Error('external_db_url is required')
      const pgClient = new PgClient(external_db_url)
      try {
        await pgClient.connect()
        const result = await pgClient.queryArray('SELECT current_database() as db, version() as version')
        const dbInfo = result.rows?.[0]
        await pgClient.end()
        return new Response(JSON.stringify({ data: { connected: true, database: dbInfo?.[0], version: String(dbInfo?.[1]).substring(0, 60) } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (e: any) {
        try { await pgClient.end() } catch {}
        return new Response(JSON.stringify({ data: { connected: false, error: e.message } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // ─── Helper: get local data ────────────────────────────────────────
    const localQuery = async (query: string) => {
      const { data, error } = await adminClient.rpc('exec_sql', { query })
      if (error) throw new Error(`Local query failed: ${error.message}`)
      return data || []
    }

    // For all migration steps, we need external_db_url
    if (!external_db_url) throw new Error('external_db_url is required')
    const pgClient = new PgClient(external_db_url)
    await pgClient.connect()

    try {
      // ─── Migrate Schema ────────────────────────────────────────────────
      if (action === 'migrate-schema') {
        const statements: string[] = []
        const labels: string[] = []

        // 1. ENUMs
        const enums = await localQuery(`
          SELECT t.typname as enum_name, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
          FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
          JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public'
          GROUP BY t.typname ORDER BY t.typname
        `)
        for (const en of enums as any[]) {
          const vals = (en.values as string).split(', ').map((v: string) => `'${v}'`).join(', ')
          statements.push(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${en.enum_name}') THEN CREATE TYPE public.${en.enum_name} AS ENUM (${vals}); END IF; END $$;`)
          labels.push(`ENUM ${en.enum_name} criado`)
        }

        // 2. Tables
        const tables = await localQuery(`
          SELECT t.table_name,
            string_agg(
              '  ' || c.column_name || ' ' || 
              CASE 
                WHEN c.udt_name = 'uuid' THEN 'UUID'
                WHEN c.udt_name = 'text' THEN 'TEXT'
                WHEN c.udt_name = 'bool' THEN 'BOOLEAN'
                WHEN c.udt_name = 'int4' THEN 'INTEGER'
                WHEN c.udt_name = 'int8' THEN 'BIGINT'
                WHEN c.udt_name = 'float8' THEN 'DOUBLE PRECISION'
                WHEN c.udt_name = 'timestamptz' THEN 'TIMESTAMP WITH TIME ZONE'
                WHEN c.udt_name = 'jsonb' THEN 'JSONB'
                WHEN c.udt_name = 'json' THEN 'JSON'
                WHEN c.udt_name = '_text' THEN 'TEXT[]'
                WHEN c.udt_name = '_int4' THEN 'INTEGER[]'
                WHEN c.udt_name = '_uuid' THEN 'UUID[]'
                ELSE UPPER(c.udt_name)
              END ||
              CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
              CASE WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default ELSE '' END,
              E',\n' ORDER BY c.ordinal_position
            ) as columns_def
          FROM information_schema.tables t
          JOIN information_schema.columns c ON c.table_schema = t.table_schema AND c.table_name = t.table_name
          WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
          GROUP BY t.table_name ORDER BY t.table_name
        `)

        const pks = await localQuery(`
          SELECT tc.table_name, string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as pk_columns
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
          WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
          GROUP BY tc.table_name
        `)
        const pkMap = new Map((pks as any[]).map((pk: any) => [pk.table_name, pk.pk_columns]))

        for (const t of tables as any[]) {
          let sql = `CREATE TABLE IF NOT EXISTS public.${t.table_name} (\n${t.columns_def}`
          const pk = pkMap.get(t.table_name)
          if (pk) sql += `,\n  PRIMARY KEY (${pk})`
          sql += `\n);`
          statements.push(sql)
          labels.push(`Tabela ${t.table_name} criada`)
        }

        // 3. Foreign Keys
        const fks = await localQuery(`
          SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name, tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
          WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
          ORDER BY tc.table_name
        `)
        for (const fk of fks as any[]) {
          statements.push(`ALTER TABLE public.${fk.table_name} DROP CONSTRAINT IF EXISTS ${fk.constraint_name};`)
          labels.push(`FK ${fk.constraint_name} removida (idempotência)`)
          statements.push(`ALTER TABLE public.${fk.table_name} ADD CONSTRAINT ${fk.constraint_name} FOREIGN KEY (${fk.column_name}) REFERENCES public.${fk.foreign_table_name}(${fk.foreign_column_name});`)
          labels.push(`FK ${fk.constraint_name} criada (${fk.table_name} → ${fk.foreign_table_name})`)
        }

        // 4. Indexes (simple ones only)
        const indexes = await localQuery(`
          SELECT indexname, tablename, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname
        `)
        const funcNames = ((await localQuery(`
          SELECT p.proname as function_name FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.prokind = 'f'
        `)) as any[]).map((f: any) => f.function_name)

        for (const idx of indexes as any[]) {
          const def = (idx.indexdef as string)
          const dependsOnFunc = funcNames.some((fn: string) => def.includes(fn + '('))
          if (dependsOnFunc) continue
          const idxDef = def
            .replace(/^CREATE INDEX /i, 'CREATE INDEX IF NOT EXISTS ')
            .replace(/^CREATE UNIQUE INDEX /i, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
          statements.push(idxDef + ';')
          labels.push(`Index ${idx.indexname} em ${idx.tablename}`)
        }

        const result = await execMultiOnExternal(pgClient, statements, labels)
        return new Response(JSON.stringify({ data: { ...result, step: 'schema' } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // ─── Migrate Functions ─────────────────────────────────────────────
      if (action === 'migrate-functions') {
        const statements: string[] = []
        const labels: string[] = []

        const functions = await localQuery(`
          SELECT p.proname as function_name, pg_get_functiondef(p.oid) as definition
          FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public' AND p.prokind = 'f' ORDER BY p.proname
        `)
        for (const fn of functions as any[]) {
          statements.push((fn.definition as string) + ';')
          labels.push(`Função ${fn.function_name}`)
        }

        // Function-dependent indexes
        const indexes = await localQuery(`
          SELECT indexname, tablename, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname
        `)
        const funcNames = (functions as any[]).map((f: any) => f.function_name)
        for (const idx of indexes as any[]) {
          const def = (idx.indexdef as string)
          const dependsOnFunc = funcNames.some((fn: string) => def.includes(fn + '('))
          if (!dependsOnFunc) continue
          const idxDef = def
            .replace(/^CREATE INDEX /i, 'CREATE INDEX IF NOT EXISTS ')
            .replace(/^CREATE UNIQUE INDEX /i, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
          statements.push(idxDef + ';')
          labels.push(`Index ${idx.indexname} (depende de função)`)
        }

        const result = await execMultiOnExternal(pgClient, statements, labels)
        return new Response(JSON.stringify({ data: { ...result, step: 'functions' } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // ─── Migrate RLS ──────────────────────────────────────────────────
      if (action === 'migrate-rls') {
        const statements: string[] = []
        const labels: string[] = []

        const rlsStatus = await localQuery(`
          SELECT relname as table_name, relrowsecurity as rls_enabled
          FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' ORDER BY relname
        `)
        for (const t of rlsStatus as any[]) {
          if (t.rls_enabled) {
            statements.push(`ALTER TABLE public.${t.table_name} ENABLE ROW LEVEL SECURITY;`)
            labels.push(`RLS habilitado em ${t.table_name}`)
          }
        }

        const policies = await localQuery(`
          SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
          FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname
        `)
        for (const p of policies as any[]) {
          statements.push(`DROP POLICY IF EXISTS "${p.policyname}" ON public.${p.tablename};`)
          labels.push(`Policy "${p.policyname}" removida (idempotência)`)

          let sql = `CREATE POLICY "${p.policyname}" ON public.${p.tablename}`
          sql += ` AS ${p.permissive === 'true' ? 'PERMISSIVE' : 'RESTRICTIVE'}`
          sql += ` FOR ${p.cmd}`
          sql += ` TO ${p.roles === '{public}' ? 'public' : p.roles?.replace(/[{}]/g, '') || 'public'}`
          if (p.qual) sql += ` USING (${p.qual})`
          if (p.with_check) sql += ` WITH CHECK (${p.with_check})`
          sql += ';'
          statements.push(sql)
          labels.push(`Policy "${p.policyname}" em ${p.tablename}`)
        }

        const result = await execMultiOnExternal(pgClient, statements, labels)
        return new Response(JSON.stringify({ data: { ...result, step: 'rls' } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // ─── Migrate Triggers ─────────────────────────────────────────────
      if (action === 'migrate-triggers') {
        const statements: string[] = []
        const labels: string[] = []
        const triggers = await localQuery(`
          SELECT trigger_name, event_manipulation, event_object_table, action_timing, action_statement
          FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY event_object_table, trigger_name
        `)
        const seen = new Set<string>()
        for (const tr of triggers as any[]) {
          const key = `${tr.trigger_name}__${tr.event_object_table}`
          if (seen.has(key)) continue
          seen.add(key)
          const events = (triggers as any[]).filter(
            (t: any) => t.trigger_name === tr.trigger_name && t.event_object_table === tr.event_object_table
          ).map((t: any) => t.event_manipulation)
          
          statements.push(`DROP TRIGGER IF EXISTS ${tr.trigger_name} ON public.${tr.event_object_table};`)
          labels.push(`Trigger ${tr.trigger_name} removido (idempotência)`)
          statements.push(
            `CREATE TRIGGER ${tr.trigger_name} ${tr.action_timing} ${events.join(' OR ')} ON public.${tr.event_object_table} FOR EACH ROW ${tr.action_statement};`
          )
          labels.push(`Trigger ${tr.trigger_name} em ${tr.event_object_table}`)
        }

        const result = await execMultiOnExternal(pgClient, statements, labels)
        return new Response(JSON.stringify({ data: { ...result, step: 'triggers' } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // ─── Migrate Storage ──────────────────────────────────────────────
      if (action === 'migrate-storage') {
        if (!external_url || !external_service_role_key) {
          throw new Error('external_url and external_service_role_key required for storage migration')
        }
        const extClient = createClient(external_url, external_service_role_key)

        const buckets = await localQuery(`
          SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets ORDER BY name
        `)
        
        let success = 0, failed = 0
        const errors: string[] = []
        const details: string[] = []
        for (const b of buckets as any[]) {
          try {
            const { error } = await extClient.storage.createBucket(b.name, {
              public: b.public || false,
              fileSizeLimit: b.file_size_limit || undefined,
              allowedMimeTypes: b.allowed_mime_types || undefined,
            })
            if (error && !error.message?.includes('already exists')) {
              failed++; errors.push(`Bucket ${b.name}: ${error.message}`)
              details.push(`✗ Bucket ${b.name}: ${error.message}`)
            } else {
              success++
              details.push(`✓ Bucket ${b.name} criado (public: ${b.public})`)
            }
          } catch (e: any) {
            failed++; errors.push(`Bucket ${b.name}: ${e.message}`)
            details.push(`✗ Bucket ${b.name}: ${e.message}`)
          }
        }

        // Storage policies
        const storagePolicies = await localQuery(`
          SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
          FROM pg_policies WHERE schemaname = 'storage' ORDER BY tablename, policyname
        `)
        for (const p of storagePolicies as any[]) {
          const dropSql = `DROP POLICY IF EXISTS "${p.policyname}" ON storage.${p.tablename};`
          let createSql = `CREATE POLICY "${p.policyname}" ON storage.${p.tablename}`
          createSql += ` AS ${p.permissive === 'true' ? 'PERMISSIVE' : 'RESTRICTIVE'}`
          createSql += ` FOR ${p.cmd}`
          createSql += ` TO ${p.roles === '{public}' ? 'public' : p.roles?.replace(/[{}]/g, '') || 'public'}`
          if (p.qual) createSql += ` USING (${p.qual})`
          if (p.with_check) createSql += ` WITH CHECK (${p.with_check})`
          createSql += ';'
          
          await execOnExternal(pgClient, dropSql)
          const r2 = await execOnExternal(pgClient, createSql)
          if (r2.success) {
            success++
            details.push(`✓ Storage policy "${p.policyname}" em ${p.tablename}`)
          } else {
            failed++; errors.push(`Storage policy ${p.policyname}: ${r2.error}`)
            details.push(`✗ Storage policy "${p.policyname}": ${r2.error}`)
          }
        }

        return new Response(JSON.stringify({ data: { success, failed, errors, details, step: 'storage' } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // ─── Migrate Data ─────────────────────────────────────────────────
      if (action === 'migrate-data') {
        const tables = await localQuery(`
          SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name
        `)
        const dataTables = (tables as any[])
          .map((t: any) => t.table_name)
          .filter((name: string) => !HIGH_VOLUME_TABLES.includes(name))

        let totalSuccess = 0, totalFailed = 0
        const errors: string[] = []
        const details: string[] = []
        const tableResults: { table: string; rows: number }[] = []

        for (const tableName of dataTables) {
          try {
            const rows = await localQuery(`SELECT * FROM public."${tableName}" LIMIT 10000`)
            if (!rows || (rows as any[]).length === 0) {
              details.push(`⊘ ${tableName}: sem dados`)
              continue
            }

            const rowsArr = rows as any[]
            const columns = Object.keys(rowsArr[0])
            
            const values = rowsArr.map((row: any) => {
              const vals = columns.map(col => {
                const v = row[col]
                if (v === null || v === undefined) return 'NULL'
                if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
                if (typeof v === 'number') return String(v)
                if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`
                if (Array.isArray(v)) return `ARRAY[${v.map((i: any) => `'${String(i).replace(/'/g, "''")}'`).join(',')}]`
                return `'${String(v).replace(/'/g, "''")}'`
              })
              return `(${vals.join(', ')})`
            })

            const batchSize = 100
            let tableRows = 0
            let tableFailed = false
            for (let i = 0; i < values.length; i += batchSize) {
              const batch = values.slice(i, i + batchSize)
              const sql = `INSERT INTO public."${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES\n${batch.join(',\n')}\nON CONFLICT DO NOTHING;`
              const r = await execOnExternal(pgClient, sql)
              if (r.success) { tableRows += batch.length; totalSuccess++ }
              else { totalFailed++; errors.push(`${tableName}: ${r.error}`); tableFailed = true }
            }
            tableResults.push({ table: tableName, rows: tableRows })
            details.push(`${tableFailed ? '⚠' : '✓'} ${tableName}: ${rowsArr.length} registros${tableFailed ? ' (com erros)' : ''}`)
          } catch (e: any) {
            totalFailed++
            errors.push(`${tableName}: ${e.message}`)
            details.push(`✗ ${tableName}: ${e.message}`)
          }
        }

        return new Response(JSON.stringify({ data: { success: totalSuccess, failed: totalFailed, errors, details, tableResults, step: 'data' } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // ─── Get Auth Users ────────────────────────────────────────────────
      if (action === 'get-auth-users') {
        const { data: { users: authUsers }, error } = await pureAdminClient.auth.admin.listUsers({ perPage: 1000 })
        if (error) throw error
        const result = (authUsers || []).map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          user_metadata: u.user_metadata,
        }))
        return new Response(JSON.stringify({ data: result, details: result.map(u => `✓ ${u.email} (${u.id.substring(0,8)}...)`) }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // ─── Verify Migration ─────────────────────────────────────────────
      if (action === 'verify-migration') {
        // Source counts
        const srcTables = await localQuery(`SELECT count(*) as c FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`)
        const srcFunctions = await localQuery(`SELECT count(*) as c FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.prokind = 'f'`)
        const srcPolicies = await localQuery(`SELECT count(*) as c FROM pg_policies WHERE schemaname = 'public'`)
        const srcTriggers = await localQuery(`SELECT count(DISTINCT trigger_name || event_object_table) as c FROM information_schema.triggers WHERE trigger_schema = 'public'`)
        const srcBuckets = await localQuery(`SELECT count(*) as c FROM storage.buckets`)

        // Target counts
        const tgtTablesR = await pgClient.queryArray(`SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`)
        const tgtFunctionsR = await pgClient.queryArray(`SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.prokind = 'f'`)
        const tgtPoliciesR = await pgClient.queryArray(`SELECT count(*) FROM pg_policies WHERE schemaname = 'public'`)
        const tgtTriggersR = await pgClient.queryArray(`SELECT count(DISTINCT trigger_name || event_object_table) FROM information_schema.triggers WHERE trigger_schema = 'public'`)

        const source = {
          tables: Number((srcTables as any[])[0]?.c || 0),
          functions: Number((srcFunctions as any[])[0]?.c || 0),
          policies: Number((srcPolicies as any[])[0]?.c || 0),
          triggers: Number((srcTriggers as any[])[0]?.c || 0),
          buckets: Number((srcBuckets as any[])[0]?.c || 0),
        }
        const target = {
          tables: Number(tgtTablesR.rows?.[0]?.[0] || 0),
          functions: Number(tgtFunctionsR.rows?.[0]?.[0] || 0),
          policies: Number(tgtPoliciesR.rows?.[0]?.[0] || 0),
          triggers: Number(tgtTriggersR.rows?.[0]?.[0] || 0),
          buckets: 0, // can't query storage.buckets on external easily
        }

        const details: string[] = []
        const items = ['tables', 'functions', 'policies', 'triggers'] as const
        for (const key of items) {
          const s = source[key], t = target[key]
          const match = t >= s
          details.push(`${match ? '✓' : '⚠'} ${key}: origem=${s}, destino=${t}`)
        }

        return new Response(JSON.stringify({ data: { source, target, details, match: details.every(d => d.startsWith('✓')) } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      throw new Error('Invalid action')
    } finally {
      try { await pgClient.end() } catch {}
    }
  } catch (error: any) {
    console.error('Migration error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
