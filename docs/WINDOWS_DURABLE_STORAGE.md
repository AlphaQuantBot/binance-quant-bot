# Windows eski defter kalıcılığı — doğrulama dalı

Durum: hazırlandı, henüz gerçek Windows Node/SQLite/ACL testleri çalıştırılmadı.
Kaynak dal: ce47368. Operatör temel sonucu: 293 test, 212 başarılı, 81 başarısız.
Bu dalın başarılı olduğu veya 81 hatayı giderdiği henüz iddia edilmez.

## Kalıcılık modeli

capitalLedger, orderExecution, dailyRiskGate, equityHistory, historyRecovery,
observedInterval ve recoveryMonitor aynı yardımcı yazma/kurtarma yolunu kullanır.

Linux/POSIX yolu önceki temp dosya fsync + rename + dizin fsync sırasını korur.
Windows yolu, temp dosya fsync sonrasında hedef dosyanın yanında
`<dosya>.durable/snapshot.sqlite` için SQLite WAL + synchronous=FULL işlemini
tamamlar; ardından JSON görünümünü rename ile yayımlar. Göndericiye ancak bu
işlemler başarılıysa dönülür. Dizin fsync hatası yakalanıp yok sayılmaz;
Windows'ta kalıcılığın otoritesi JSON yerine SQLite işlemidir.

İlk başarılı yazma eski geçerli JSON durumundan SQLite otoritesine geçer.
Var olan sınıfların şema, hesap, tutar, emir kimliği ve halt kontrolleri korunur.
Var olan lock dosyaları korunur; stale lock otomatik silinmez.

Yeniden açılışta SQLite otoritesi varsa mutlaka okunur. JSON mevcut son payload,
bir önceki payload veya eksik dosya olabilir. Son iki durumda SQLite'ın son
kaydı JSON görünümünü onarır. Başka JSON içeriği, bozuk/boş SQLite, beklenmeyen
depolama veya doğrulanmayan ACL durdurur; iyi görünen JSON'a sessiz geri dönüş yok.
Rename başarısızlığı yine çağırana hata verir. Bu sırada kaydedilmiş gönderim
niyeti yeniden açıldığında eski sınıfın UNKNOWN/query-only kurtarmasına girer;
yeniden POST yetkisi verilmez.

JSON ve .durable dizini (SQLite, WAL, SHM dahil) tek bir yedekleme birimidir.
Süreç kapalıyken birlikte yedekleyin. .durable dizinini silerek ya da eski JSON'u
tek başına geri yükleyerek defteri sıfırlamayın. Bu sürüm geri alma/migrasyon
sihirbazı sunmaz. Bu dalda henüz gerçek özel hesap dosyalarını açmayın.

## Windows erişim izinleri

privateStorage, Windows PowerShell ve .NET ACL API'leriyle yeni özel dosyaya
ve SQLite dizinine korumalı DACL uygular. Yalnızca mevcut kullanıcı SID'si ve
SYSTEM için FullControl tanımlar; sahibi mevcut kullanıcıdır. Dizin kuralları
alt dosyalara miras kalır. ACL uygulama ve doğrulaması başarısızsa işlem durur.
Yönetici yetkisi veya execution policy değişikliği istenmez.

PowerShell'e yalnızca dosya yolu ve gerekli Windows ortam yolları geçirilir;
uygulamanın API anahtarları veya diğer ortam sırları aktarılmaz. Kabuk komutuna
dosya yolu metin olarak eklenmez, özel ortam değişkeninden LiteralPath okunur.

Kimlik bilgisi kasası şifreli temp dosyaya özel izinleri rename'den önce uygular;
okuma sırasında gerçek ACL'yi kontrol eder. POSIX'te 0600 kontrolü sürer.
Windows testleri POSIX mode bitleri yerine bu ACL doğrulamasını çağırır.
Eski izinleri geniş kasa dosyası otomatik güvenilir kabul edilmez.

## Temizleme ve testler

Başarısız intent yazmasından sonra OrderExecution kilidi kapatılabilir;
aynı close iki kez çağrılınca fd tekrar kapatılmaz. Aktif gönderim ve uzlaşma
işlemi kapanışı engellemeye devam eder.

Testlerde bozuk ham JSON enjeksiyonları korunur. Sadece geçerli kaza durumunu
taklit eden test enjeksiyonları iki temsili tutarlı yazan test yardımcılarına
geçti. Test başlangıcı için companion silen yardımcı yalnızca geçici test
dizinlerinde kullanılır; üretim kodu onu içe aktarmaz.

Yeni testler rename hatası, SQLite'tan kurtarma, bozuk kaynakta geri dönüşün
reddi, gönderimden önce disk hatası ve idempotent kapanışı kontrol eder.
Hiçbir test atlanmaz. Test adapterleri fixture'tır; gerçek borsa emri göndermez.

Bu tur çalışma konteyneri environment_offline hatası verdi. Altı kontrol
durumunu kapsayan V8 sahte dosya/SQLite durum makinesi simülasyonu başarılıydı.
Bu, native SQLite fsync, Windows ACL, TypeScript veya tam suite doğrulamasının
yerine geçmez. Gerçek cihazda aşağıdaki kontroller gerekir:

```powershell
git fetch origin
```

```powershell
git switch --track origin/codex/windows-durable-storage
```

```powershell
npm.cmd run lint
```

```powershell
npm.cmd run test:security
```

Bu aşamada yalnızca testleri çalıştırın. Testler geçse bile otomatik işlem
ve ana ağ yürütmesi açılmaz. Sonraki adım gerçek dosyalara kontrollü geçiştir.

Kaynaklar:
- https://www.sqlite.org/pragma.html#pragma_synchronous
- https://nodejs.org/api/fs.html (Windows chmod sınırlamaları)
- https://learn.microsoft.com/en-us/dotnet/api/system.security.accesscontrol.filesystemsecurity.setaccessruleprotection
