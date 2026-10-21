# Aday için yerel emir ve komisyon kontrolü

Bu sürüm testnet:decision komutuna yalnızca güncel BUY/SELL adayı oluşursa
çalışan yerel kontrol ekler. HOLD veya deney BTC bakiyesi sıfırken SELL
kesişimi oluşması aday üretmez; bu durumda orderReview NOT_APPLICABLE döner.
Sinyal üretmek için eşikler değiştirilmez veya emir yönü zorlanmaz.

## Kontroller

Karar mevcut sinyal, defter ve hesap kanıtlarıyla yeniden hesaplanır.
Güncel referans/kotasyon ve gerçek hesap komisyon oranları birlikte okunur.
Hesap bağlamı ve zaman damgaları yeniden kontrol edilir.
Alış için mevcut planTestnetOrderCheck, satış için planScopedTestnetSell
kullanılır; gerçek emir fonksiyonları veya politikaları değiştirilmez.

Yerel doğrulama mevcut PRICE_FILTER, LOT_SIZE, notional, spread, slippage,
referans/percent-price, emir sayısı ve native MAX_POSITION kurallarını korur.
MAX_POSITION hesabında deney dışı gerçek BTC bakiyesi sıfırlanmaz.

BUY için principal (notional yukarı yuvarlanmış 18 hane) ve indirimsiz en
yüksek maker/taker ücret tahmini toplamı deneyin availableCashUSDT alanına
sığmalıdır. Tüm hesap nakdi deneyin serbest nakdi yerine geçmez. Notional
sınırı 25 USDT'dir; komisyon ayrı hesaplanır. İndirim uygulanmaz.
SELL miktarı sadece deney ownedBTC alanından gelir, lot ve 25 USDT sınırına
aşağı yuvarlanır. Mevcut satış planlayıcısının sıfır komisyon politikası
korunur; pozitif/eksik desteklenmeyen ücret durumunda kontrol bloke olur.
BUY yerel ücret tahmini pozitif olabilir; bu gerçek BUY komutunun sıfır
ücret dışını reddetme politikasını değiştirmez.

## Çıktı

LOCAL_CHECKS_PASSED yalnızca mevcut yerel planlayıcı ve oran kontrolünün
geçtiğini ifade eder. Rapor side, quantity, limitPrice,
boundedNotionalUSDT, undiscountedFeeEstimateUSDT ve discountApplied false
gösterir. ClientOrderId veya gönderilebilir intent nesnesi döndürülmez.

- exchangeValidated false: order/test veya gerçek order POST yapılmamıştır.
- capitalReserved false: yerel/uzak sermaye ayrılmamıştır.
- feeReservationAuthorized false: ücretin hangi native varlıktan
  ödeneceği/rezerve edileceği yürütme için doğrulanmış değildir.
- executionAuthorized false ve automaticTradingEnabled false kalır.
- Tam hesap günlük risk, otomasyon ve kullanılmış tek seferlik deney
  kimliği engelleri kaldırılmaz.
- Yerel doğrulama geçerse ORDER_RULES_AND_FEES_NOT_VALIDATED yerine
  LOCAL_REVIEW_IS_NOT_EXCHANGE_ORDER_VALIDATION ve
  FEE_ASSET_RESERVATION_NOT_AUTHORIZED engelleri görünür.
- Kontrol başarısızsa assessment BLOCKED, candidate NONE ve allowlist
  hata kodu döner; ham exchange hata mesajı veya anahtar yayımlanmaz.

Bu komut, kayıtlı emirlere GET sorgusu ve defter mutabakatı yapabilir;
yerel defterde doğrulanmış sonuç/halt kaydı güncellenebilir. Yeni emir
rezervasyonu, gönderim, iptal, order/test, döngü veya deney sıfırlama yoktur.

## Doğrulama

c91d9fc için operatör TypeScript kontrolünü ve önceki sekiz karar testini
başarıyla çalıştırdı. Gerçek testnet karar çıktısı WAIT / NO_NEW_CROSS,
ordersSubmitted 0 idi. Bu yeni yerel kontrolün test sonucu değildir.

Bu tur konteyner kapalı olduğundan yeni Node testleri ve TypeScript burada
çalıştırılamadı. 12 V8 kontrol akışı testi geçti; bu simülasyonda planlayıcılar
stub idi, gerçek filtre/komisyon entegrasyonu iddia edilmiyor. Eklenen sekiz
Node testi gerçek mevcut planlayıcıları kullanır; cihazda doğrulanmalıdır:

```powershell
git pull --ff-only
```

```powershell
npm.cmd run lint
```

```powershell
node --import tsx --test tests/scopedSignalDecision.test.ts tests/scopedSignalOrderReview.test.ts
```

Bunlar geçerse:

```powershell
npm.cmd run testnet:decision
```

Aday yoksa NOT_APPLICABLE beklenen sonuçtur. Bunu kontrol başarısı olarak
saymayın; adayın gerçek veride yerel doğrulama sonucu ayrıca gözlenmelidir.
