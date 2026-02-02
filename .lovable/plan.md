
# Aplicar Visual Aurora e Glass ao Dashboard Completo

## Visao Geral
Aplicar o visual moderno com glassmorphism a todas as paginas do dashboard (Instancias, Usuarios, Configuracoes, Agendamentos, Disparador, Historico) e adicionar efeito de hover com glow verde nos cards.

---

## Arquivos a Modificar

| Arquivo | Descricao |
|---------|-----------|
| `src/index.css` | Adicionar classe `glass-card-hover` com efeito glow verde |
| `src/pages/dashboard/Instances.tsx` | Aplicar glass-card aos cards e dialogs |
| `src/pages/dashboard/UsersManagement.tsx` | Aplicar glass-card aos cards de usuario |
| `src/pages/dashboard/Settings.tsx` | Substituir `.glass` por `.glass-card` |
| `src/pages/dashboard/ScheduledMessages.tsx` | Aplicar glass-card aos cards de mensagens |
| `src/pages/dashboard/Broadcaster.tsx` | Aplicar glass-card aos cards de selecao |
| `src/components/dashboard/StatsCard.tsx` | Adicionar efeito hover glow |
| `src/components/dashboard/InstanceCard.tsx` | Adicionar efeito hover glow |
| `src/components/dashboard/DashboardCharts.tsx` | Adicionar efeito hover glow |

---

## Mudancas Detalhadas

### 1. src/index.css

Adicionar nova classe para hover com glow verde:

```css
/* Glass card com hover glow */
.glass-card-hover {
  @apply glass-card transition-all duration-300;
}

.glass-card-hover:hover {
  border-color: hsl(142 70% 45% / 0.3);
  box-shadow: 
    0 0 30px -5px hsl(142 70% 45% / 0.25),
    0 0 60px -10px hsl(142 70% 45% / 0.15),
    inset 0 1px 0 0 hsl(0 0% 100% / 0.08);
}
```

### 2. src/components/dashboard/StatsCard.tsx

Atualizar para usar a nova classe com hover:

**Antes:**
```tsx
<Card className={cn('glass-card', className)}>
```

**Depois:**
```tsx
<Card className={cn('glass-card-hover', className)}>
```

### 3. src/components/dashboard/InstanceCard.tsx

Atualizar para usar a nova classe com hover:

**Antes:**
```tsx
<Card className="glass-card hover:border-primary/30 transition-all group">
```

**Depois:**
```tsx
<Card className="glass-card-hover group">
```

### 4. src/components/dashboard/DashboardCharts.tsx

Atualizar todos os cards de graficos:

**Antes:**
```tsx
<Card className="glass-card">
```

**Depois:**
```tsx
<Card className="glass-card-hover">
```

### 5. src/pages/dashboard/Settings.tsx

Substituir a classe `.glass` por `.glass-card-hover`:

**Antes:**
```tsx
<Card className="glass border-border/50">
```

**Depois:**
```tsx
<Card className="glass-card-hover">
```

Aplicar a todos os 3 cards da pagina (System Info, Security, Database).

### 6. src/pages/dashboard/UsersManagement.tsx

Atualizar os cards de usuario:

**Antes (linha 414):**
```tsx
className="relative p-5 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all"
```

**Depois:**
```tsx
className="relative p-5 glass-card-hover"
```

### 7. src/pages/dashboard/Instances.tsx

Atualizar o dialog de QR Code para usar glass-card:

**Antes (DialogContent):**
```tsx
<DialogContent>
```

**Depois:**
```tsx
<DialogContent className="glass-card border-none">
```

### 8. src/pages/dashboard/ScheduledMessages.tsx

Atualizar o card de mensagem agendada:

**Antes (linha 141):**
```tsx
<Card>
```

**Depois:**
```tsx
<Card className="glass-card-hover">
```

Atualizar tambem o card de estado vazio:

**Antes (linha 396):**
```tsx
<Card>
```

**Depois:**
```tsx
<Card className="glass-card">
```

### 9. src/pages/dashboard/Broadcaster.tsx

Atualizar os cards de selecao:

**Antes (linhas 169, 195, 233):**
```tsx
<Card className="border-border/50 bg-card/50 backdrop-blur-sm">
```

**Depois:**
```tsx
<Card className="glass-card-hover">
```

E o card de resumo de grupos selecionados:

**Antes (linha 233):**
```tsx
<Card className="border-border/50 bg-muted/30">
```

**Depois:**
```tsx
<Card className="glass-card">
```

---

## Resultado Visual Esperado

```
+--------------------------------------------------+
|  CARD (estado normal)                            |
|  - Fundo: slate-900/60                           |
|  - Borda: verde/15 sutil                         |
|  - Blur: backdrop-blur-2xl                       |
+--------------------------------------------------+

+--------------------------------------------------+
|  CARD (hover)                                    |
|  - Borda: verde/30 mais visivel                  |
|  - Glow: sombra verde radiante                   |
|  - Efeito suave de destaque                      |
+--------------------------------------------------+
```

---

## O Que NAO Sera Alterado

- Funcionalidades de todas as paginas
- Logica de autenticacao e permissoes
- Rotas e navegacao
- Componentes internos dos cards

---

## Checklist de Validacao

1. Verificar que todos os cards tem o visual glass
2. Passar o mouse sobre os cards e verificar o efeito glow verde
3. Navegar entre todas as paginas do dashboard
4. Testar na pagina de Instancias
5. Testar na pagina de Usuarios
6. Testar na pagina de Configuracoes
7. Testar na pagina de Agendamentos
8. Testar na pagina do Disparador
9. Verificar responsividade em mobile
