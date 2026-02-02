
# Aplicar Visual Aurora ao Dashboard

## Visao Geral
Aplicar o mesmo estilo visual moderno (background aurora, glassmorphism aprimorado) da tela de login a todo o dashboard, incluindo a sidebar e a area de conteudo principal.

---

## Arquivos a Modificar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/dashboard/DashboardLayout.tsx` | Aplicar background aurora na area principal |
| `src/components/dashboard/Sidebar.tsx` | Estilizar sidebar com glassmorphism |
| `src/index.css` | Adicionar classes utilitarias para sidebar glass |

---

## Mudancas Detalhadas

### 1. src/index.css

Adicionar nova classe para sidebar com glassmorphism:

```css
/* Sidebar com glassmorphism */
.sidebar-glass {
  @apply bg-slate-900/80 backdrop-blur-xl;
  border-right: 1px solid hsl(142 70% 45% / 0.1);
}
```

### 2. src/components/dashboard/DashboardLayout.tsx

Aplicar o background aurora ao container principal:

**Antes:**
```tsx
<div className="flex h-screen bg-background">
```

**Depois:**
```tsx
<div className="flex h-screen bg-aurora">
```

A area de conteudo mantera o scroll com fundo transparente, permitindo que o gradiente aurora apareca por tras dos cards.

### 3. src/components/dashboard/Sidebar.tsx

Substituir o fundo solido por glassmorphism:

**Antes:**
```tsx
<aside className={cn(
  'h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
  collapsed ? 'w-20' : 'w-64'
)}>
```

**Depois:**
```tsx
<aside className={cn(
  'h-screen flex flex-col sidebar-glass transition-all duration-300',
  collapsed ? 'w-20' : 'w-64'
)}>
```

Tambem ajustar:
- Header da sidebar (borda mais sutil)
- Bordas internas para usar transparencia verde

---

## Resultado Visual Esperado

```
+------------------+------------------------------------------+
|                  |                                          |
|    SIDEBAR       |           CONTEUDO                       |
|    (glassmorphism|           (fundo aurora visivel)         |
|    com blur)     |                                          |
|                  |    +-------------+  +-------------+      |
|  [Logo]          |    | StatsCard   |  | StatsCard   |      |
|                  |    | (glass)     |  | (glass)     |      |
|  Dashboard       |    +-------------+  +-------------+      |
|  Agendamentos    |                                          |
|  Disparador >    |    +--------------------------------+    |
|  Instancias >    |    | Chart Card (glass backdrop)    |    |
|                  |    +--------------------------------+    |
|  Admin           |                                          |
|  Usuarios        |                                          |
|  Config          |                                          |
|                  |                                          |
|  [Avatar]        |                                          |
|  [Sair]          |                                          |
+------------------+------------------------------------------+
```

---

## O Que NAO Sera Alterado

- Funcionalidades da sidebar (navegacao, collapse, submenus)
- Logica de autenticacao
- Componentes de conteudo (StatsCard, DashboardCharts, InstanceCard)
- Rotas e navegacao

---

## Checklist de Validacao

1. Abrir o dashboard apos login
2. Verificar que o fundo aurora aparece atras de todo o layout
3. Verificar que a sidebar tem efeito de vidro (blur)
4. Verificar que os cards internos mantem o estilo glass
5. Verificar que a navegacao funciona normalmente
6. Verificar que o collapse da sidebar funciona
7. Testar em mobile para garantir responsividade
