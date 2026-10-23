# AlfaQuant — PancakeSwap Gözlem Terminali

Bu revizyon BNB Chain üzerindeki PancakeSwap havuzlarını araştırmak için salt okunur bir terminaldir.
Cüzdan bağlamaz; alım, satım, onay, geri alım veya yakım işlemi göndermez.

Sözleşme adresi veya sembolle havuz araştırması, kaynak bağlantıları, yerel takip listesi, açık sorgu için fiyat alarmları ve oturum gözlem geçmişi sunar.
Eksik veriler bilinmiyor olarak gösterilir. AI ve sözleşme denetimi henüz entegre değildir; sayısal özetler bu adlarla sunulmaz.

## Başlatma
Node.js 24:
```sh
npm install
npm run lint
npm run test:observation
npm run build
npm run dev
```
http://127.0.0.1:3000

[Uygulanan kapsam ve kalan modüller](docs/PANCAKESWAP_OBSERVATION_REVISION.md).
