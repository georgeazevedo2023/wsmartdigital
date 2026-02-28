

# Modernizacao do Painel Administrativo

## Objetivo
Reformular o painel de administracao para uma experiencia mais moderna, intuitiva e responsiva, aplicando principios de UX como Lei de Hick (reduzir opcoes visiveis), Mobile-First e feedback visual aprimorado.

## Mudancas Planejadas

### 1. Tabs redesenhadas com scroll horizontal no mobile
- Substituir a TabsList atual por tabs com icones maiores e scroll suave no mobile
- No mobile, mostrar apenas icone + badge (sem texto) para caber na tela
- Adicionar indicador animado (underline) na tab ativa
- Agrupar "Backup" e "Migracao" sob uma unica tab "Ferramentas" (Lei de Hick: 5 tabs -> 4 tabs)

### 2. Header com stats resumidos
- Adicionar mini-cards de estatisticas no topo (total caixas, usuarios, membros ativos)
- Stats cards com glassmorphism seguindo o tema visual existente
- No mobile, exibir stats em row horizontal com scroll

### 3. Tab Caixas de Entrada -- melhorias
- Cards ao inves de acordeao: cada caixa como um card glassmorphism com status visual proeminente (dot + texto)
- Webhook URLs em tooltip/hover ao inves de expandir (menos ruido visual)
- Acoes agrupadas em menu contextual (tres pontos) no canto do card
- Grid de 2 colunas no desktop, 1 coluna no mobile

### 4. Tab Usuarios -- melhorias
- Cards uniformes em grid (desktop: 3 colunas, tablet: 2, mobile: 1)
- Cada card mostra avatar, nome, email, badge de papel e contagem de instancias
- Seletor de papel como segmented control dentro do card (mais visual que dropdown)
- Acoes (instancias, excluir) como icones no footer do card
- Barra de busca com filtro por tipo (All/Admin/Gerente/Atendente) como chips

### 5. Tab Equipe -- melhorias
- Agrupar por caixa de entrada (ao inves de por usuario) para melhor escaneabilidade
- Cada caixa mostra seus membros com avatar em linha
- Adicionar membro diretamente na caixa com botao "+"

### 6. Dialogs modernizados
- Adicionar stepper visual no dialog de criacao de usuario (dados -> perfil -> confirmacao)
- Animacoes de entrada/saida suaves nos dialogs
- Validacao inline nos campos (feedback imediato)

### 7. Micro-interacoes e polish
- Skeleton loading com shimmer animation
- Toast de sucesso com animacao de check
- Transicoes suaves entre tabs (fade + slide)
- Empty states com ilustracoes vetoriais simples e CTA direto

## Detalhes Tecnicos

### Arquivos modificados
- `src/pages/dashboard/AdminPanel.tsx` -- refatoracao completa do render (manter toda a logica de estado e handlers)

### Abordagem
- Manter TODA a logica de negocio intacta (handlers, fetchers, estado)
- Refatorar apenas a camada de apresentacao (JSX/CSS)
- Extrair sub-componentes internos para legibilidade: `AdminStatsBar`, `InboxCard`, `UserCard`, `TeamSection`
- Usar classes Tailwind existentes + glassmorphism do tema
- Manter compatibilidade com os dialogs e sub-componentes existentes (ManageInboxUsersDialog, ManageUserInstancesDialog, CreateInboxUserDialog, BackupModule, MigrationWizard)

### Responsividade
- Breakpoints: mobile (<640), tablet (640-1024), desktop (>1024)
- Touch targets minimos de 44px no mobile
- Tabs com icones-only no mobile, icone+texto no desktop
- Grid adaptativo em todas as tabs
- Busca com largura total no mobile

