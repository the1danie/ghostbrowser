# GhostBrowser — Fingerprint Engine

## Обзор

Fingerprint Engine состоит из двух модулей:

1. **`fingerprint-generator.ts`** — генерация рандомного, но реалистичного набора параметров
2. **`fingerprint-injector.ts`** — создание JS-скрипта, который переопределяет браузерные API

## Генератор (`fingerprint-generator.ts`)

### Функции

```typescript
generateFingerprint(overrides?: Partial<BrowserFingerprint>): BrowserFingerprint
```
Генерирует полностью рандомный fingerprint. Можно передать `overrides` для фиксации отдельных полей.

```typescript
generateFingerprintForProxy(proxyCountry?: string, overrides?): BrowserFingerprint
```
Генерирует fingerprint с timezone/locale, привязанными к стране прокси.

### Пулы данных

| Параметр | Размер пула | Источник |
|----------|-------------|----------|
| User-Agent | 15 строк | Реальные Chrome/Firefox/Safari/Edge UA |
| Screen Resolution | 10 вариантов | Самые распространённые разрешения |
| WebGL Renderer/Vendor | 10 вариантов | NVIDIA, AMD, Intel, Apple, Mesa |
| Timezone | 16 зон | Основные часовые пояса мира |
| Fonts | 28 шрифтов | Windows + macOS + Google Fonts |
| Platform | 3 | Win32, MacIntel, Linux x86_64 |
| Hardware Concurrency | 6 | 2, 4, 6, 8, 12, 16 |
| Device Memory | 4 | 2, 4, 8, 16 GB |

### Логика сопоставления

- **Platform** определяется из UA: если UA содержит "Windows" → `Win32`, "Macintosh" → `MacIntel`, иначе → `Linux x86_64`
- **Locale/Language** привязываются к timezone через маппинг `LOCALES`
- **Canvas/Audio noise** — рандомные значения в безопасных диапазонах

### Расширение пулов

Чтобы добавить новые User-Agent или WebGL renderers:
1. Добавить элемент в соответствующий массив в `fingerprint-generator.ts`
2. Формат UA должен быть реальным (проверяй на whatismybrowser.com)
3. WebGL: `{ vendor: "...", renderer: "..." }` — должен соответствовать реальным GPU

## Инжектор (`fingerprint-injector.ts`)

### Функция

```typescript
generateInjectionScript(fp: BrowserFingerprint): string
```
Принимает fingerprint, возвращает строку JS-кода для инъекции через `context.addInitScript()`.

### Техники переопределения

#### 1. Navigator properties
```javascript
Object.defineProperty(Navigator.prototype, 'userAgent', {
  get: () => fp.userAgent,
  configurable: true,
});
```
Переопределяются: `userAgent`, `platform`, `hardwareConcurrency`, `deviceMemory`, `language`, `languages`, `doNotTrack`, `maxTouchPoints`.

#### 2. Screen properties
```javascript
Object.defineProperty(Screen.prototype, 'width', {
  get: () => fp.screenResolution.width,
  configurable: true,
});
```
Также переопределяются `window.innerWidth/Height`, `outerWidth/Height`.

#### 3. WebGL
Перехват `getParameter()` для `UNMASKED_VENDOR_WEBGL` (0x9245) и `UNMASKED_RENDERER_WEBGL` (0x9246). Работает для обоих `WebGLRenderingContext` и `WebGL2RenderingContext`.

#### 4. Canvas Fingerprint
Перехват `toDataURL()` и `toBlob()`. Перед вызовом оригинальной функции добавляется шум к пикселям через `getImageData()`/`putImageData()`. Количество шума контролируется `fp.canvasNoise`.

#### 5. AudioContext
Перехват `AudioBuffer.prototype.getChannelData()`. К каждому семплу добавляется рандомный шум величиной `fp.audioNoise`.

#### 6. WebRTC
При `policy === 'disable'`:
- `RTCPeerConnection` = undefined
- `webkitRTCPeerConnection` = undefined
- `mediaDevices.getUserMedia` = reject
- `mediaDevices.enumerateDevices` = empty array

#### 7. Timezone
- `Intl.DateTimeFormat.resolvedOptions()` возвращает `fp.timezone`
- `Date.prototype.getTimezoneOffset()` возвращает смещение в минутах через маппинг `tzOffsets`

#### 8. Plugins
Эмуляция стандартных Chrome-плагинов: Chrome PDF Plugin, Chrome PDF Viewer, Native Client.

#### 9. Battery API
`navigator.getBattery()` возвращает `{ charging: true, level: 1.0, ... }`.

#### 10. Font Detection Defense
`CanvasRenderingContext2D.measureText()` добавляет микрошум к `width`, предотвращая точный font fingerprinting.

## Добавление нового параметра fingerprint

1. Добавить поле в `BrowserFingerprint` интерфейс (`src/lib/supabase.ts`)
2. Добавить генерацию значения в `generateFingerprint()` (`fingerprint-generator.ts`)
3. Добавить переопределение API в `generateInjectionScript()` (`fingerprint-injector.ts`)
4. Добавить UI-контрол в `FingerprintEditor.tsx`
5. Supabase миграция не нужна — fingerprint хранится как JSONB
