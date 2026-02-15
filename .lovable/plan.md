
# Centralizar acoes do ChatInput em um botao "+"

## Objetivo

Substituir os botoes individuais (Notas, Documento, Emoji) por um unico botao "+" que abre um menu popover com as opcoes organizadas. Isso limpa a interface e torna as acoes mais intuitivas.

## Layout Atual

```text
[Nota] [Documento] [Emoji] [___Textarea___] [Enviar/Mic]
```

## Layout Proposto

```text
[+] [___Textarea___] [Enviar/Mic]
```

Ao clicar no "+", abre um Popover (acima do botao) com 4 opcoes:

1. **Nota privada** (icone StickyNote) - Ativa/desativa modo nota
2. **Enviar imagem** (icone Image) - Abre seletor de arquivos filtrado para imagens
3. **Enviar documento** (icone Paperclip) - Abre seletor de arquivos filtrado para documentos
4. **Emoji** (icone Smile) - Abre o EmojiPicker existente

## Secao Tecnica

### Alteracoes em `src/components/helpdesk/ChatInput.tsx`

1. **Adicionar imports**: `Plus`, `Image`, `Smile` do lucide-react; `Popover`, `PopoverTrigger`, `PopoverContent` do radix.

2. **Adicionar estado**: `const [menuOpen, setMenuOpen] = useState(false);`

3. **Adicionar segundo input de arquivo** (ref `imageInputRef`) com `accept` restrito a imagens: `.jpg,.jpeg,.png,.gif,.webp`. O `fileInputRef` existente fica restrito a documentos: `.pdf,.doc,.docx,...`

4. **Substituir os 3 botoes** (Nota, Paperclip, EmojiPicker) por um unico botao "+" que abre o Popover:

```text
<Popover open={menuOpen} onOpenChange={setMenuOpen}>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9">
      <Plus className="w-5 h-5" />
    </Button>
  </PopoverTrigger>
  <PopoverContent side="top" align="start" className="w-auto p-2">
    <div className="flex flex-col gap-1">
      <!-- Nota Privada -->
      <button onClick={() => { setIsNote(!isNote); setMenuOpen(false); }}>
        <StickyNote /> Nota privada
      </button>
      <!-- Enviar Imagem -->
      <button onClick={() => { imageInputRef.current?.click(); setMenuOpen(false); }}>
        <Image /> Enviar imagem
      </button>
      <!-- Enviar Documento -->
      <button onClick={() => { fileInputRef.current?.click(); setMenuOpen(false); }}>
        <Paperclip /> Enviar documento
      </button>
      <!-- Emoji (abre submenu ou inline) -->
      <EmojiPicker onEmojiSelect={(emoji) => { setText(prev => prev + emoji); setMenuOpen(false); }} />
    </div>
  </PopoverContent>
</Popover>
```

5. **Manter o banner de nota privada** acima do textarea quando `isNote` estiver ativo.

6. **Desabilitar opcoes de midia** quando `isNote` estiver ativo ou `sendingFile` for true.

### Arquivo modificado:
- `src/components/helpdesk/ChatInput.tsx`
