
## Objetivo
Corrigir a sobreposição entre os ícones (Mail/Lock/User) e o texto/placeholder dentro dos inputs da tela de login (/login). Pela imagem, o texto está iniciando “por baixo” do ícone, indicando que o padding-left do input não está sendo aplicado de forma efetiva.

---

## Diagnóstico (por que acontece)
- O componente `Input` (`src/components/ui/input.tsx`) aplica `px-3` por padrão.
- No `Login.tsx`, foi aplicado `className="input-with-icon"`, mas **`input-with-icon` é uma classe CSS custom** (definida em `src/index.css` com `@apply pl-12 ...`).
- Como o Tailwind “não enxerga” o `pl-12` dentro da classe custom no momento do merge de classes (`twMerge`), o `px-3` permanece ativo e, dependendo da ordem final do CSS, ele pode sobrescrever o padding-left do `.input-with-icon`. Resultado: o texto fica muito à esquerda e entra na área do ícone.

---

## Estratégia de correção (sem gambiarra e sem mudar lógica de negócio)
**Trocar o uso de classes custom (`input-with-icon`) por utilities Tailwind diretamente no `Login.tsx`**, porque aí:
- `twMerge` consegue detectar conflito entre `px-3` (do `Input`) e `pl-12/pr-3` (passados pelo login),
- e automaticamente remove o `px-3`, garantindo o padding correto.

---

## Mudanças planejadas

### 1) Ajustar inputs do Login para usar padding explícito
**Arquivo:** `src/pages/Login.tsx`

- Substituir em todos os `<Input className="input-with-icon" />` por algo como:
  - `className="pl-12 pr-3 bg-slate-800/50 border-slate-700/50"`

Isso garante:
- Espaço suficiente para o ícone (`pl-12`)
- Mantém padding à direita (`pr-3`)
- Mantém o visual “premium” atual (mesmas cores/bordas)

Aplicar nos 4 campos:
- login-email
- login-password
- signup-name
- signup-email
- signup-password

### 2) Ajustar (opcional, mas recomendado) os ícones no Login para garantir consistência
Ainda no `src/pages/Login.tsx`:
- Substituir `className="input-icon"` nos ícones por utilities diretamente (ex.: `className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"`), OU manter `input-icon` se estiver ok.
- Se mantivermos `input-icon`, não precisa mexer no CSS agora; mas se persistir algum caso, a troca para utilities garante que nada externo interfere.

### 3) (Opcional) Limpeza / prevenção futura
**Arquivo:** `src/index.css`

Se a troca for feita para utilities no `Login.tsx`, podemos:
- manter `.input-with-icon` e `.input-icon` (sem impacto), ou
- remover depois (não é obrigatório para corrigir o problema).

Eu priorizarei corrigir sem remover nada para minimizar risco.

---

## Critérios de aceite (o que você deve ver após a correção)
1. No /login, o placeholder e o texto digitado começam claramente após o ícone (sem cortar “seu@email.com”).
2. O ícone fica alinhado verticalmente ao centro do input.
3. O mesmo comportamento vale para Email e Senha tanto no “Entrar” quanto no “Criar Conta”.
4. Testar em desktop e mobile (larguras pequenas) para garantir que não volta a sobrepor.

---

## Teste rápido (checklist)
- Abrir /login
- Clicar em Email e Senha
- Verificar placeholder inteiro visível
- Digitar um email longo e uma senha e conferir que não encosta no ícone
- Alternar para aba “Criar Conta” e repetir

---

## Se ainda houver sobreposição depois disso (plano B)
Caso algum browser/CSS ainda sobrescreva padding:
- Aplicar `!pl-12` e `!pr-3` diretamente no `className` do `Input` no Login (utilities com `!`), garantindo prioridade absoluta sem mexer no componente global `Input`.
