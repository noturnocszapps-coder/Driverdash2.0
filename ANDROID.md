# Guia de Publicação Android - DriverDash

Este documento detalha o estado final do app para submissão à Google Play Store.

## Configurações de Identidade
- **Package Name**: `br.com.ntaplicacoes.driverdash` (Confirmado em `capacitor.config.ts`)
- **App Name**: `DriverDash`
- **Versão**: `1.0.0`
- **Build Number**: Deve ser incrementado a cada submissão no arquivo `android/app/build.gradle`.

## Permissões e Justificativas (Android)

Para a Play Store, é obrigatório justificar o uso de permissões sensíveis:

1.  **ACCESS_FINE_LOCATION** & **ACCESS_COARSE_LOCATION**:
    - **Uso**: Essencial para o cálculo de quilometragem percorrida e automação de ganhos por KM.
    - **Justificativa**: O app fornece auditoria financeira baseada em deslocamento real. Sem isso, a principal proposta de valor (lucrabilidade por KM) é perdida.
2.  **FOREGROUND_SERVICE** (Se aplicável):
    - **Uso**: Necessário para manter o rastreamento ativo enquanto o motorista utiliza outros apps de navegação (Waze/Maps).
3.  **SCREEN_WAKE_LOCK**:
    - **Uso**: Utilizado no **Modo Direção** para evitar que a tela apague durante a operação.

## Arquivos Necessários (Manual)
Os seguintes arquivos não são persistidos no repositório de código por segurança e devem ser adicionados manualmente no ambiente de build:

- `android/app/google-services.json`: Download via Firebase Console.
- `android/release-key.jks`: Chave de assinatura gerada via Keytool ou Android Studio.

## Checklist de Submissão Play Store

### 1. Elementos Gráficos
- [ ] **Ícone do App**: 512x512px (PNG/WebP).
- [ ] **Feature Graphic**: 1024x500px.
- [ ] **Screenshots Mobile**: Pelo menos 4 telas principais (Dash, Analytics, Faturamento, Modo Direção).
- [ ] **Screenshots Tablet**: (Opcional, mas recomendado).

### 2. Informações de Segurança de Dados (Data Safety)
- [ ] **Localização**: Declarar que o app coleta localização (pode ser compartilhada para fins analíticos).
- [ ] **Identificadores Pessoais**: Nome e Email (via Supabase/Auth).
- [ ] **Dados Financeiros**: Informar que o processamento de faturamento é local ou via nuvem segura.

### 3. Links Obrigatórios
- [ ] **Política de Privacidade**: Deve estar hospedada em uma URL pública (ex: `driverdash.app/privacy`).
- [ ] **Termos de Uso**: Link disponível no app e na loja.

## Comandos de Build Final

```bash
# 1. Limpar e Build Web
npm run clean
npm run build

# 2. Sincronizar com Android
npx cap sync android

# 3. Gerar App Bundle (.aab) no Android Studio
# Vá em: Build > Generate Signed Bundle / APK...
```

---
**Status**: Pronto para Produção.
