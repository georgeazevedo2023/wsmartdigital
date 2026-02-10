

# Substituir CTAs por "Agendar Demonstracao" com Mensagem no WhatsApp

## Resumo

Remover os botoes "Testar Gratis por 7 Dias" e "Ver Demonstracao" (e suas correlacoes como badges de "7 dias gratis", "Sem cartao de credito", etc.) e substituir por um unico botao **"Agendar Demonstracao"** que abre o WhatsApp com uma mensagem pre-definida para o numero **5581993856099**.

---

## Alteracoes por Arquivo

### 1. `src/components/landing/HeroSection.tsx`

- **Remover** os dois botoes atuais ("Testar Gratis por 7 Dias" + "Ver Demonstracao")
- **Adicionar** um unico botao "Agendar Demonstracao" que abre `https://wa.me/5581993856099?text=...` com mensagem pre-definida (ex: "Ola! Gostaria de agendar uma demonstracao do WsmartQR.")
- **Remover** os trust badges abaixo dos botoes ("7 dias gratis", "Sem cartao de credito", "Cancele quando quiser")
- Remover imports nao usados (`Play`, `Shield`, `Link`)

### 2. `src/components/landing/FinalCTASection.tsx`

- **Substituir** o botao "Criar Conta Gratis" por "Agendar Demonstracao" com link para WhatsApp
- **Remover** a secao de garantias ("7 dias gratis", "Sem cartao de credito", "Cancele quando quiser")
- **Remover** o badge "Periodo de testes com acesso ilimitado"
- **Atualizar** os trust elements: remover "Garantia de 7 dias", manter "Conexao segura SSL" e "Suporte via WhatsApp"
- Remover imports nao usados (`Clock`, `CreditCard`, `Link`)

### 3. `src/components/landing/FAQSection.tsx`

- **Atualizar** a FAQ "Posso testar antes de pagar?" para refletir o novo fluxo (agendar demonstracao em vez de teste gratis)
- **Atualizar** a FAQ "E se eu nao gostar?" para remover mencoes aos 7 dias de teste gratis

---

## Detalhes Tecnicos

### Link do WhatsApp

Todos os botoes "Agendar Demonstracao" usarao:
```
https://wa.me/5581993856099?text=Olá! Gostaria de agendar uma demonstração do WsmartQR.
```

Implementado como `<a>` com `target="_blank"` e `rel="noopener noreferrer"`, envolvendo o componente `Button`.

### Icone

Trocar `ArrowRight` / `Play` pelo icone `MessageCircle` do Lucide (ou `Calendar`) para representar melhor a acao de agendar via WhatsApp.

