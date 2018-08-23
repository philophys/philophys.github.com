---
title: Kilitler, Kilitlenme ve Eşzamanlama
categories: Bilgisayar
---

Selamlar.

Bu yazıda Windows işletim sistemlerindeki kilitler, kilitlenmeler ve eşzamanlama konusu hakkında çeviriye benzer bir şeyler yazacağım. Ana kaynak olarak MSDN üzerindeki belgeleri kullandım, çeviriden sıkıldığım yerlerde kafadan yazdım sonunda ortaya böyle bir şey çıktı. İşletim sistemlerinin yapısını ve nasıl çekirdek sürücüsü geliştireceğinizi anlamak için bilmeniz gereken temellerden bazıları da bu yazıdakiler. İnşallah devamı gelecek. Bu arada, okurken arka tarafta [şunu](https://www.youtube.com/watch?v=R-dXS5TI_dQ) dinlemenizi öneririm, yazarken güzel eşlik etti okurken de eder umarım...

## Giriş
Windows işletim sistemi sürücülere eşzamanlamayı sağlamak için çeşitli imkanlar sunar. Genel olarak eşzamanlama

* Paylaşılan bir veriye birden çok işlemciğin özellikle yazma yapmak için erişmesi
* Bir grup işlemin mecburi atomik(bir seferde çalışması gereken) olarak gerçekleşmesi

için gereklidir.

Eşzamanlamanın neden önemli olduğunu anlamak için, aynı anda iki işlemciğin(*thread*) bir genel değişkende arttırma işlemi yaptığını düşünün. Bu işlem çeşitli sebeplere göre örneğin üç adımla olabilir:

* **gDegisen** değişkeninin değerini yazmaca alma
* Yazmaçtaki değere 1 ekleme
* Yazmaçtaki değeri tekrardan **gDegisen** değişkenine koyma

Eğer çoklu işlemcili bir sistemde bu işlemcikler aynı anda ve herhangi bir kilitleme veya eşzamanlama nesnesi kullanılmadan çalışırsa sonuç beklediğimiz gibi olmayabilir. Örneğin **gDegisen** değerinin **0** olduğunu düşünelim ve işlemlerin aşağıdaki gibi gerçekleştiğini varsayalım.

**Çoklu işlemcili bir sistemde herhangi bir kilit kullanmayan işlemciklerin durumu:**

![](/files/coklu-islemci-kilit-olmadan.png)

Burada, iki işlemcik de **gDegisen** değişkenini güncellediğinde değerin 2 olmasını bekleriz fakat burada **B** işlemciğinin yaptığı işlem **A** işlemciğinin sonucu tekrar **gDegisen** değişkenine yazması sonucunda kaybolacaktır. İşte bunun gibi durumların sebep olduğu sorunlara genel olarak *yarış durumu* (race condition) denilmektedir. 

Tek işlemcili bir sistemde bile işlemciklerin kesintiye uğraması (*pre-emption*) bu tür yarış durumlarına sebebiyet verebilir. Herhangi bir zamanda işletim sistemi belki de bir işlemciğin çalışmasını aniden durdurup daha yüksek önceliğe sahip bir işlemciği çalıştırmaya başlayabilir. İşletim sistemi bir işlemciğin çalışmasını kestiğinde, o işlemciğin o andaki işlemci yazmacı değerlerini kaydeder ardından tekrar bu işlemcik çalışmaya başladığında bu değerler geri yüklenir bu sayede işlemcik kaldığı yerden çalışmaya devam eder.

Aşağıdaki örnek ise yarış durumlarının tek işlemcili bir sistemde nasıl meydana gelebileceğine dair bir örnek.

**Tek işlemcili bir sistemde herhangi bir kilit kullanmayan işlemciklerin durumu:**

![](/files/tekli-islemci-kilit-olmadan.png)

Çoklu işlemcili sistem örneğindeki gibi sonuç olarak yine **gDegisen** değişkeni 2 olması gerekirken 1 olacaktır.

İki örnekte de bir kilitleme mekanizmasının kullanılması mevcut yarış durumunu engelleyebilecektir. Buradaki kilit **A** işlemciği işini bitirmeden **B** işlemciğinin değişkene dokunmasına izin vermeyecek bu sayede örnekteki eşzamanlama sağlanacaktır.

**Herhangi bir sistemde kilitleme mekanizması kullanan işlemciklerin durumu:**

![](/files/herhangi-bir-sistemde-kilit-ile.png)

Buradaki kilit başka bir işlemcik veriye erişirken diğer işlemciklerin erişmesini engelleyecektir. Bu işlemlerin sonucu olarak ise beklediğimiz sonuç olan 2 **gDegisen** değişkeninde olacaktır.

## Eşzamanlama Mekanizmasının Seçilmesi

Herhangi bir durumda seçilecek olan en iyi eşzamanlama mekanizması, o durumun kendisine bağlıdır. Eşzamanlama mekanizmaları kendi içerisinde bazı gruplara ayrılırlar. Her grup için Window ayrı bir eşzamanlama nesnesi sunar. Aşağıdaki tablo bunların bir özetini gösteriyor.

**Alışılmış eşzamanlama metodları:**

![](/files/genel-eszamanlama-metodlari.png)

Aşağıda buradaki eşzamanlama nesneleri ile ilgili özet bilgileri bulabilirsiniz.

### Kilitlemeli işlemler (Interlocked operations)

Bir kilitlemeli işlem, bi işi atomik olarak yapan işlemdir. Atomik olarak yapılması demek ise A işleminin kesintiye uğramadan tek seferde yapılması anlamını taşır. Windows işletim sistemi mantıksal, aritmetik ve listelerin değiştirilmesi için kilitlemeli fonksiyonlar sunar.

### Muteksler

Bir muteks bir yere karşı tarafı da gözeterek erişime imkan verir; yani, başka bir işlemcik muteksi elde ettiğinde diğer işlemcik öncelikle muteksi elde eden işlemciğin işini bitirmesini beklemek zorundadır. İşlemcikler kritik veriye erişmeden önce muteksi alırlar, işlerini yaparlar ve ardından muteksi bırakırlar. Eğer bir muteks alınmışsa diğer işlemcikler ya döngüye girmeli ya da o muteksin bırakılmasını beklemelidirler.

Herhangi bir karşı tarafı gözetmeli erişim imkanı veren kilitleme mekanizması muteks olarak anılabilir. Örneğin, döngü kilitler (*spin locks*) ve eşzamanlama olayları (*synchronization events*) muteks olarak sayılabilir çünkü örneğin bir döngü kilidini aynı anda sadece bir işlemcik alabilir ayrıca bir eşzamanlama olayı oluştuğunda yine bir işlemcik harekete geçebilir. Eğer muteks kullanmaya karar verirseniz aşağıdakileri kendi durumunuz için gözden geçirin:

* Hangi *IRQL* seviyesinde muteks alınacak ve bırakılacak?
* Muteksi almanız *IRQL* seviyesini yükseltecek mi? Eğer öyle ise eski *IRQL* nerede saklanacak?
* Muteks alındığı işlemcik tarafından mı bırakılmak zorunda?
* Muteks özyinelemeli olarak alınabilir mi? (Yani muteksi alan işlemcik, aldığı muteksi bırakmadan bir kez daha alabilir mi?)
* Muteksi almış olan işlemcik sonlanırsa o mutekse ne olacak? (Bu sorun genelde kullanıcı modunda alınan muteksler içindir)

Aşağıdaki listede Windows sürücülerinde kullanılan bazı muteksleri genel özellikleri ile birlikte görüyorsunuz. Her biri hakkında detaylı bilgi yazının ilerleyen bölümlerinde verilecek.

![](/files/windows-muteksleri.png)

### Ortak/Özel kilitler (Shared/Exclusive Locks)

Ortak/Özel kilitler (aynı zamanda okuma/yazma kilitleri olarak da bilinir) ya yalnızca bir işlemciğin veriye yazma erişimine izin verir ya da birçok işlemciğin veriyi okumasına aynı anda izin verir. Yazma iznine sahip olan işlemcik yazma yaparken okuma iznine sahip olan işlemcikler verinin okumasını yapabilirler.

Windows işletim sisteminde yönetim kaynakları(*executive resources*) okuma/yazma kilidi olarak kullanılabilir (Ç.N: Sanırım yeni bir şeyler de vardı MSDN üzerinde, baz aldığım belge biraz güncelliğini yitirmiş).

### Sayılı Semaforlar

Sayılı semaforlar mutekslere benzer, farkı ise semaforların belirli sayıda işlemciğin semaforu alabilmesi imkanını sunmasıdır. Sayılı semaforlar örneğin belirli miktarda işlemciğin erişebileceği verileri korumak için kullanışlı olabilir.

Windows işletim sistemindeki semaforlar(kendisi bir çekirdek "*dispatcher*" nesnesidir) sayılı semafor olarak kullanılabilir.

## Windows Eşzamanlama Mekanizmaları

Windows işletim sistemi çoğu *IRQL* kısıtlamaları ile alakalı çeşitli eşzamanlama mekanizmaları sunar. Bu nedenle bu eşzamanlama mekanizmalarını kullanmak için öncelikle işlemciklerin kesintiye uğraması durumunu ve *IRQL* seviyelerinin ne işe yaradıklarını biraz bilmelisiniz.

Meselam bir işlemciğin düşük bir *IRQL* seviyesinde bir kilidi aldığını düşünelim, ardından bu işlemci kesmeye uğruyor ve daha yüksek *IRQL* seviyesinde çalışmaya başlıyor. Eğer yüksek *IRQL* seviyesindeyken yine aynı kilidi almaya çalışırsa muhtemelen sonuç kısır döngü olacaktır. Dahası, düşük seviyeli *IRQL* seviyesinde çalışmakta olan kodun devam edebilmesi için *IRQL* seviyesinin de düşürülmesi gerekir, fakat bunun olabilmesi için yüksek *IRQL* seviyesindeki kodun kilidi alabilmesi gerekmektedir. Düşük seviyedeki kod kilidi bırakamayacağı için (çünkü çalışma imkanı yok) sistem kısır döngüde kalıp kilitlenecektir. İşte bu sorunun çözülebilmesi için sürücüler kilidi almadan önce o kilit için çıkabilecekleri en yüksek *IRQL* seviyesine çıkarlar.

Aşağıda Windows işletim sistemindeki bazı eşzamanlama mekanizmalarını ve onların *IRQL* kısıtlamalarını görüyorunuz.

![](/files/windows-eszamanlama-nesneleri.png)

## InterlockedXxx fonksiyonları

**InterlockedXxx** fonksiyonları atomik olarak genel aritmetik ve mantıksal işlemleri bakışık çok işlemcili sistemlerde (*SMP - symmetric multiprocessing*) doğru bir şekilde gerçekleştirebilmeyi sağlar. Mümkün olduğu her an sürücüler bu fonksiyonları kullanmalıdır. Bunların çoğu işlemci tarafından sağlanan komutları kullandığı için ayrı bir kilide ihtiyaç duymazlar.

**InterlockedXxx** fonksiyonları diske alınabilir veri ile kullanılabilirler. Genellikle derleyici tarafından satır içi derlenirler ve herhangi bir *IRQL* seviyesinde çağırılabilirler.

## Döngü kilitler (Spin locks)

Döngü kilitler isminden anlaşılabileceği gibi bir sebepten ötürü döngüye girilmesine sebep olan kilitlerdir. Bir işlemcik kilidi aldığında diğer işlemcikler o kilidi alabilmek için döngüye girerler (spin atarlar). Bu bekleyen işlemcikler engellenemez; yani, bunlar duraksatılmaz veya diske alınamaz aksine işlemcinin kontrolü elinde tutar ve bu nedenle de aynı veya daha düşük IRQL seviyesindeki kodların çalışmasını engellerler. Bundan dolayı özellikle döngü kilitleri kısa bir süre için tutulmalıdır.

![](/files/dongu-kilit.png)

Görselde gördüğünüz gibi paylaşılan bir veri alanı var. 1. işlemci o alanda birtakım işlemler yapmak için *t1* zamanında döngü kilidini alıyor ve işlemleri yapmaya başlıyor, bu kilidi *t3* zamanına kadar tutuyor. Sonra, *t2* zamanında 2. işlemci o alanda işlem yapmak için döngü kilidi almaya karar veriyor fakat *t1* zamanında kilit zaten alındığı için kilidi alamıyor, ve almak için döngüye girerek bekliyor. *t3* zamanı gelip 1. işlemci kilidi bırakınca, 2. işlemci bekleme döngüsünden çıkıp kilidi alıyor ve *t4* zamanına kadar kilidi tutup kendi işlemlerini yapıyor. Böylece paylaşılan veriye eşzamanlama sağlanmış oluyor.

Döngü kilitleri `KSPIN_LOCK` yapısı ile tanımlanır. Bu yapı zorunlu olarak *diske alınamaz*(non-paged) bir hafıza alanından ayrılmalıdır. Windows işletim sistemi birkaç çeşit döngü çeşidi sunar bunlar aşağıda gözüküyor (Ç.N: bunlar dışında bir de okuma/yazma döngü kilitleri geldi sanırım fakat buraya eklemiyorum MSDN bakabilirsiniz).

![](/files/dongu-kilitleri.png)

Tüm döngü kilitler *IRQL* seviyesini `DISPATCH_LEVEL` veya daha yüksek bir seviyeye çıkarırlar. `DISPATCH_LEVEL` ve daha yüksek *IRQL* seviyelerinde kullanılabilen tek eşzamanlaman nesnesi döngü kilitleridir. Bir döngü kilidi almış olan kod parçası, `DISPATCH_LEVEL` veya daha yukarı seviye bir *IRQL* seviyesinde çalışır, bu da demektir ki işlemcikler arası geçişi sağlayan kod (*dispatcher*) çalışamaz bu nedenle de şu anki işlemciğin çalışması kesilmez. Bunun performansa olumsuz etkisinden dolayı sürücülerde kullanılan döngü kilitler çok kısa süreler için tutulmalıdır (en fazla önerilen süre 25 milisaniyedir).

Döngü kilidi alınmış durumda olan tüm kodlar `DISPATCH_LEVEL` seviyesinin kısıtlamalarına uymak zorundadır. Bu nedenle tüm sürücü geliştiricileri bu kuralları bilmelidir. Örneğin döngü kiliti tutan bir kod diske alınmış bir adrese erişemez. Bunun olması durumunda sayfa hatası oluşur, bu hatanın çözülebilmesi için sayfa dosyasına yapılan girdi/çıktı işlemlerinin bitmesi için bir olay (*event*) nesnesini beklenmesi gerekir fakat işletim sistemi `DISPATCH_LEVEL` ve yukarısında bekleme yapamaz bu nedenle hata çözülemez ve sistem `IRQL_NOT_LESS_OR_EQUAL` hata koduyla çöker. Bunun dışında da kısıtlamalar vardır fakat bunlar bu belgenin konusu değil, inşallah başka bir belgede anlatırız.

Tek işlemcili sistemlerde döngü kilitler farklı çalışır. Eşzamanlama yapılması gereken başka bir işlemci olmadığı için burada anlatılanlar yerine sadece *IRQL* seviyesi `DISPATCH_LEVEL` seviyesine çıkartılır. Bu sayede işlemciklerin değişmesi engelleneceği ve aynı anda başka bir işlemcik de çalışamayacağı için eşzamanlama sağlanmış olur.

### Sıradan döngü kilitleri

Bu tür döngü kilitleri `DISPATCH_LEVEL` seviyesinde çalışırlar. Bu tür bir döngü kilidini kullanabilmek için öncelikle sürücü geliştiricisi diske alınamaz (*non-paged*) bir alanda `KSPIN_LOCK` yapısı için bir alan ayırır. Ardından bu yapıyı `KeInitializeSpinLock()` fonksiyonunu kullanarak hazır hale getirir. `DISPATCH_LEVEL` aşağısında çalışan kodlar bu kilidi kullanabilmek için `KeAcquireSpinLock()` ve `KeReleaseSpinLock()` fonksiyonlarını kullanır. Bu fonksiyonlar kilidi almadan önce *IRQL* seviyesini `DISPATCH_LEVEL` seviyesine çıkarır kilidi bıraktığında ise tekrar eski haline getirirler.

Halihazırda `DISPATCH_LEVEL` seviyesinde çalışan kodlar yukarıdaki fonksiyonlar yerine `KeAcquireSpinLockAtDpcLevel()` ve `KeReleaseSpinLockFromDpcLevel()` fonksiyonlarını kullanmalıdır. Bu fonksiyonlar *IRQL* seviyesini değiştirmezler.

### Sıralı döngü kilitleri

Sıralı döngü kilitleri sıradan döngü kilitlerine göre daha iyi performans sunan bir döngü kilidi çeşididir. Windows XP sürümünden itibaren kullanılabilirler. Birtakım işlemcikler sıralı bir döngü kilidi almak için başvurduklarında bu işlemcikler bir sıraya koyulur. Bu sıraya ilk giren kilit bırakıldığında kilidi alır ve bu sırayla bu şekilde devam eder. Ek olarak, sıralı döngü kilitleri kullanılan işlemciye ait bir yerel değişkende test edip işaretleme işlemi yaparlar. Bu nedenle sistemdeki veri yolu daha az meşgul olur.

Sıralı döngü kilitleri `KSPIN_LOCK` yapısının yanında bir de `KLOCK_QUEUE_HANDLE` yapısına ihtiyaç duyarlar. Bu yapı alınmak istenen kilide ait sıraya ve kilide ait tutamağı (*handle*) içerisinde saklar. Bu yapı yığında oluşturulabilir ve yine sıralı döngü kilitlerinde de döngü kilidinin hazır hale getirilmesi için `KeInitializeSpinLock()` fonksiyonu kullanılır.

*IRQL* seviyesinin doğru bir şekilde arttırılıp azaltılması için `PASSIVE_LEVEL` veya `APC_LEVEL` seviyesinde çalışan kodlar bu tür döngü kilitlerini elde etmek ve bırakmak için sırayla `KeAcquireInStackQueuedSpinLock()` ve `KeReleaseInStackQueuedSpinLock()` fonksiyonlarını kullanır. Halihazırda `DISPATCH_LEVEL` seviyesinde çalışan kodlar ise *IRQL* seviyesi değiştirmeyen `KeAcquireInStackQueuedSpinLockAtDpcLevel()` ve `KeReleaseInStackQueuedSpinLockFromDpcLevel()` fonksiyonlarını kullanırlar.

### Kesme döngü kilitleri

Kesmen döngü kilitleri mesela bir aygıtın `InterruptService` ve `SynchCritSection` rutinlerinin DIRQL seviyesinde eriştiği yazmaçlarını korur. Bir aygıt kendi kesme kapısını bağladığında işletim sistemi otomatik olarak bu kesme için bir kesme döngü kilidi oluşturur. Sürücü geliştirici bu döngü kilidi için alan ayırmak veya hazırlamak zorunda değildir, işletim sistemi bunu kendi yapar.

Bu aygıta ait kesme oluştuğunda işletim sistemi IRQL seviyesini DIRQL seviyesine çıkarır, ardından bu kesmeye ait olan kesme döngü kilidini elde eder sonra da o kesmeye ait olan `InterruptService` rutinini çalıştırır. Bu rutin çalıştığı sürece işletim sistemi DIRQL seviyesinde kalmaya ve bahsi geçen kilidi tutmaya devam eder. Bu rutin işini bitirdiğinde sistem bahsi geçen kilidi bırakır ve IRQL seviyesini tekrar eski haline düşürür(tabi o IRQL seviyesinde bekleyen başka bir iş yoksa).

İşletim sistemi ayrıca `KeSynchronizeExecution()` fonksiyonu ile **SynchCritSection** rutini çalıştırılmadan önce de bu kilidi elde eder. Yine biraz önceki gibi sistem IRQL seviyeini DIRQL seviyesine çıkartıp sürücüye ait olan kesme döngü kilidini elde eder. Rutin bittiğinde kilit bırakılır ve IRQL eski haline düşürülür. `InterruptService` veya `SynchCritSection` rutini ile veri paylaşımı yapan diğer rutinlerin erişim yapmadan önce `KeAcquireInterruptSpinLock()` fonksiyonu ile bahsi geçen kesme döngü kilidini elde etmeleri gerekir. 

## ExInterlockedXxx fonksiyonları
**ExInterlockedXxx** fonksiyonları aritmetik ve liste üzerinde yapılan işlemlerde kullanılır. Tüm bu fonksiyonlar (`ExInterlockedAddLargeStatistic hariç()`) sürücü tarafından tahsis edilmiş bir döngü kilidi kullanırlar.

**ExInterlockedXxx** fonkiyonları assembly dilinde yazılmıştır ve genelde çalıştıklarında kesmeleri devre dışı bırakırlar, dahası üzerinde çalıştıkları veriyi korumak için bakışık çok işlemcili sistemlerde `HIGH_LEVEL` *IRQL* seviyesinde çalışırlar. Bu tür sistemlerde veriye erişimin güvenle yapılabilmesi için önce *IRQL* seviyesi arttırılır ardından döngü kilidi alınır. Fonksiyon bittiğinde kilit bırakılır ve *IRQL* tekrar eski haline döndürülür. *IRQL* >= *DISPATCH_LEVEL* durumunda çalışan diğer fonksiyonlar gibi **ExInterlockedXxx** fonksiyonları da işlem yapacakları verinin diske alınamaz (*non-paged*) bir alanda olması durumunda işlem yapabilirler. Bu nedenle bu fonksiyonlara gönderilecek herhangi bir veri diske alınamaz bir hafıza alanından, çekirdek yığınından veya aygıt eklenti alanından(çünkü burası da bir diske alınamaz alandır) tahsis edilmiş olmalıdır.

**ExInterlockedXxx** fonksiyonlarını sürücünün başka yerlerde de eriştiği paylaşılan verileri değiştirmek için kullanabilirsiniz. Örneğin sürücünün aygıtı ile ilgili bilgileri sakladığı bir veri yapısı düşünün. `PASSIVE_LEVEL` seviyesinde çalışan bazı fonksiyonların dışında aynı zamanda *DpcForIsr* fonksiyonu da bu veriye erişiyor olsun. Bu fonksiyon `DISPATCH_LEVEL` seviyesinde çalıştığı için buradaki verinin döngü kilit ile korunması gerektiği açığa çıkar. Bu yapıdaki bir veriyi değiştirmek için sürücü öncelikle bu fonksiyonlar sayesinde döngü kilidi elde eder, sonra işlemi yapıp tekrar bırakır.

Aritmetik olanların dışında Windows **ExInterlockedXxx** fonksiyonlarının 3 çeşit listeyi yönetmesi için de fonksiyonlar sunar, bunlar:

* Tek yönlü bağlı listeler
* Çift yönlü bağlı listeler
* S-listeleri (sıralı, tek yönlü bağlı listeler)

Sürücüler çeşitli koşullarda farklı listelerle işlem yapabilir. Eğer birden fazla işlemciğin bu listelere erişimi söz konusu ise eşzamanlama yapılması gerekir. Tek ve çift yönlü bağlı listeler için aşağıda görülebileceği üzere işletim sistemi hem kilitlemeli(*interlocked*), hem de kilitlemeli olmayan(non-interlocked) fonksiyonlar sunmaktadır.

![](/files/kilitlemeli-ve-kilitlemesiz-liste-fonksiyonlari.png)

**ExInterlockedXxx** fonksiyonları sürücü tarafından tahsis edilen bir döngü kilit kullanırlar. Bu rutinler herhangi bir IRQL seviyesinde çağırılabilir ve bu sayede söz konusu listeye erişim güvenle sağlanabilir.

**ExInterlockedXxxSList** fonksiyonları ise S-Listelerini değiştirmek için kullanılırlar. S-listeleri sıralanmış, kilitlemeli tek yönlü listelerdir. Bunlar hem çoklu işlemciklerde hem de çoklu işlemcilerde güvenle kullanılabilir. Her S-listesinin kendine ait bir döngü kilidi bir de sıra numarası vardır. Döngü kilidi bu listeye olan erişimi eşzamanlamak için kullanılır, sıra numarası ise listeye veri eklenmesi-silinmesi sırasında arttırılır. Hatta bazı donanımlarda bu sıra numarasının kullanılması döngü kilide olan gereksinimi kaldırabilir.

S-listesi fonksiyonlarını kullanmak için sürücünün *IRQL* <= *DISPATCH_LEVEL* durumunu sağlaması gerekir. S-listeleri önbellekleme yapmak için kullanışlıdırlar çünkü sürücüler basitçe ve hızlıca listeye son eklenen girdiyi silebilirler. 

## Hızlı muteksler

Hızlı muteksler aynı zamanda yönetim muteksleri olarak da adlandırılmaktadır. Bu muteksler sürücüye bir alanı ayrıcalıklı olarak kullanma imkanı sunmaktadır. Belli bir muteks bir işlemcik tarafından tutuluyorsa, başka bir işlemcik o muteksi alamaz bu sayede erişim ayrıcalıklı bir şekilde sağlanır. Hızlı muteksler `FAST_MUTEX` veri yapısı ile tanımlanırlar, bu yapılar diske alınamaz bir hafıza alanından ayrılmalıdır.

Hızlı muteksler sistemin genelinde kullanılan "*dispatcher*" veritabanını kullanmadıkları için performansları normal mutekslere göre daha iyidir.

Bir hızlı muteks tarafından korunan alanda çalışan kodlar *IRQL* = *APC_LEVEL* durumunda çalışmaktadırlar. Bu durum APClerin devre dışı olması demektir, bu ise çalışan işlemciğin duraksatılmasına engel olur. Aşağıdaki tabloda hızlı muteksleri elde etmede kullanabileceğiniz fonksiyonları görüyorsunuz.

![](/files/hizli-muteksi-elde-etme-fonk.png)

`ExAcquireFastMutex()` ve `ExAcquireFastMutexUnsafe()` fonksiyonları eğer muteksi alamazsa, muteks alınabilir duruma gelene dek çalışmakta olduğu işlemciği engeller (yani o işlemcik başka bir işlem yapamaz). `ExTryToAcquireFastMutex()` fonksiyonu ise eğer muteks başka bir işlemcik tarafından alınmış ise, geriye *FALSE* değeri döndürür, yani işlemciği engellemez. Hem `ExAcquireFastMutex()` hem de `ExTryToAcquireFastMutex()` fonksiyonları hızlı muteksi almadan önce *IRQL* seviyesini `APC_LEVEL` seviyesine çıkartır. Sürücüler aşağıdaki şartlardan birini sağlıyorsa ExAcquireFastMutexUnsafe fonksiyonunu kullanmalıdır.

* İşlemcik `APC_LEVEL` seviyesinde çalışıyorsa
* Daha önceden `KeEnterCriticalRegion()` veya `FsRtlEnterFileSystem()` kullanarak bir kritik alana giriş yapmış ise

Her iki durumda da kullanıcı modu ve normal çekirdek modu APCleri devre dışı durumda olacaktır.

Sürücüler hızlı muteksleri kullanmak için şunları yapmalı:

1. Diske alınamaz bir alandan `FAST_MUTEX` yapısı için alan ayırın
2. `ExInitializeFastMutex()` fonksiyonu ile hızlı muteksi kullanıma hazırlayın
3. Korunması gereken alana erişmeden hemen önce `ExAcquireFastMutex()`, `ExAcquireFastMutexUnsafe()` veya `ExTryToAcquireFastMutex()` fonksiyonunu kullanarak hızlı muteksi elde edin
4. Korunan alan üzerinde yapmanız gereken işlemleri yapın
5. `ExReleaseFastMutex()` veya `ExReleaseFastMutexUnsafe()` fonksiyonunu kullanarak hızlı muteksi bırakın.

Hızlı muteksler aşağıdaki kısıtlamalara sahiptir:

* Hızlı muteksler özyinelemeli olarak alınamazlar. Böyle bir deneme kilitlenmeye sebebiyet verir.
* Hızlı muteksi tutan bir sürücü kodu *IRQL* = *APC_LEVEL* durumunda çalışır. Bu nedenle hızlı muteks tutulurken örneğin `IoBuildDeviceIoControlRequest()` gibi yalnızca `PASSIVE_LEVEL` seviyesinde çalışabilen fonkiyonlar çalıştırılamaz.
* Hızlı muteksler çekirdek "*dispatcher*" nesnesi değillerdir. Bu nedenle sürücü `KeWaitForMultipleObjects()` fonksiyonuyla hem çekirdek "*dispatcher*" nesnesi hem de hızlı muteks nesnesini aynı anda bekleyemez. 

## Çekirdek "dispatcher" nesneleri

İşletim sistemi birkaç çeşit eşzamanlama tipi sunan bazı çekirdek "*dispatcher*" nesnesi sunmaktadır. Bu nesnelerin kullanımı oldukça basittir, ve genelde *IRQL* = *PASSIVE_LEVEL* durumunda kullanılırlar. Aşağıda bazı çekirdek "*dispatcher*" nesnelerini görüyorsunuz.

![](/files/cekirdek-dispatcher-nesneleri.png)

Sürücü bu nesnelerden birini `KeWaitForSingleObject()` ve `KeWaitForMultipleObject()` fonksiyonları ile birlikte kullanabilir. Bu fonksiyonlar sayesinde sürücü bir veya birden fazla nesne için belirli bir süre bekleme yapabilir.

### Ortak özellikler

İşletim sistemi tüm çekirdek "*dispatcher*" nesnelerini "*dispatcher*" veritabanı denilen bir veritabanı ile yönetir. Bu nesnelerden herhangi birini değiştirmek için *IRQL* seviyesinin `DISPATCH_LEVEL` seviyesine çıkarılması ve ardından bu veritabanını koruyan kilidin alınması gerekir. Fakat, bu kilit işletim sisteminde birçok durumda kullanıldığı için bazen bu kilidi almak için beklemeniz gerekebilir. Bu tür beklemeler ise sürücünün performansını etkileyebilir. Bu sebepten dolayı, mümkün olduğu zaman sürücüler hızlı muteksleri veya yönetim kaynaklarını kullanmalıdır.

Tüm çekirdek "*dispatcher*" nesneleri aynı yapı başlığını (`DISPATCHER_HEADER`) temel alarak tanımlanırlar fakat hepsinin kendine özgü özellikleri ve bundan dolayı kendilerine ait fonksiyonları olur. Çekirdek "*dispatcher*" nesneleri diske alınmaz bir hafı alanından tahsis edilmelidir.

Bir sürücü nesneye o nesneye ait bir tutamak veya işaretçi ile erişebilir. Eğer sürücü tutamak kullanarak nesneye başka bir işlemciğin bağlam alanından erişecekse bu durumda o nesnenin özellikleri arasında `OBJ_KERNEL_HANDLE` belirtilmelidir. Bu özellik bu nesnesin sadece çekirdek modu tarafından erişilebilir olmasını sağlar. 

Sürücüler genelde bir eşzamanlı bir G/Ç işlemini beklemek için çekirdek "*dispatcher*" nesnesi kullanırlar. Yüksek seviyeli sürücüler G/Ç isteği oluşturup düşük seviyeli sürücülere gönderdiğinde söz konusu G/Ç isteğini oluşturan işlemciğin bağlam alanında beklerler. Düşük seviyeli sürücüler ise bazı durumlarda `PASSIVE_LEVEL` ve `APC_LEVEL` seviyesinde çalışan fonksiyonlar ile eşzamanlama yapmak için başka bir işlemciğin bağlam alanında beklemek zorunda kalabilir.

Çekirdek "*dispatcher*" nesnelerinin iki durumu vardır : sinyallenmiş/işaretlenmiş ve sinyallenmemiş/işaretlenmemiş. Sinyallemenin anlamı o nesneni alınmak için uygun olması demektir. Bu nedenle sinyallenmiş bir nesne, henüz bir işlemcik tarafından alınmamış/elde edilmemiştir. Sinyallenmiş bir durumda olan nesne ise bir veya birden fazla işlemcik tarafından elde edilmiş demektir. Nesnenin tipi oluşturulduğu sıradaki ilk durumuna etki eder. Örneğin çekirdek muteksleri oluşturulduklarında sinyallenmiş, yani alınabilir durumda olurlar, fakat olay nesneleri ise KeSetEvent kullanılarak sinyallenmiş duruma getirilirler.

Her tipteki nesnenin kendine ait hazır hale getirme ve bırakma fonksiyonları olsa da sürücüler `KeWaitForSingleObject()` veya `KeWaitForMultipleObjects()` fonksiyonlarını kullanarak herhangi bir çekirdek "*dispatcher*" nesnesini elde edebilirler. `KeWaitForSingleObject()`kullanarak sürücü bir çekirdek "*dispatcher*" nesnesi için, `KeWaitForMultipleObjects()` kullanarak bir/birden fazla farklı veya aynı türde çekirdek "*dispatcher*" nesnesi beklenebilir. Bu fonksiyonlar şu parametrelerle işlem yapar:

* Alınacak olan nesneye/nesnelere işaretçi.
* Beklemek için neden. Kullanıcı modunda ve kullanıcı isteği için beklenilen nesneler için **UserRequest**; diğer durumlarda **Executive** kullanılmalıdır. Bu değer yalnızca bilgilendirme amacı taşır.
* Bekleme yapan işlemciğin uyarılabilir (*Alertable*) olup olmadığı belirten bir değer. Sürücüler için genelde bu değer *FALSE* olarak seçilir.
* Bir bekleme modu (*WaitMode*), **KernelMode** veya **UserMode** seçilebilir. Sürücüler için bu değer genelde **KernelMode** olmaktadır. Eğer nesnelerden biri muteks ise bu değer **KernelMode** olmak zorundadır.
* İsteğe bağlı bir zaman değeri. Bu değer beklemenin ne kadar süre sonra zaman aşımına uğrayacağını belirtir.

#### IRQL kısıtlamaları

Herhangi bir işlemcik herhangi bir çekirdek "*dispatcher*" nesnesini *IRQL* <= *DISPATCH_LEVEL* olması durumunda sinyalleyebilir fakat eğer o nesneyi bekleyecekse *IRQL* <= *APC_LEVEL* olmak zorundadır. Bunun sebebi bekleme yapılırken işlemcik değişmesine izin verilmesi gerektiği içindir. Fakat dediğimiz gibi `DISPATCH_LEVEL`'de işlemcikler arası değiştirme yapan kod çalışmayacağı için bekleme de yapılamaz. Bu durum bir sürücünün `IoCompletion`, `StartIo` veya herhangi bir DPC rutininde bekleme yapılamayacağı anlamına gelir çünkü bu rutinler `DISPATCH_LEVEL` seviyesinde çalışırlar. Bu nedenle bu bekleme işlemleri yüksek seviyeli sürücünün okuma/yazma rutinlerinde yapılmalıdır. Fakat eğer sürücü düşük seviyeli ise, o zaman bu rutinler de `DISPATCH_LEVEL` seviyesinde çağırılabileceği için bekleme yapmaktan kaçınılmalıdır.

Buna karşılık bir işlemcik herhangi bir çekirdek "*dispatcher*" nesnesini `DISPATCH_LEVEL` seviyesindeyken eğer o nesneyi beklemeyecekse, sinyalleyebilir. Bunu yapmak için `KeWaitForSingleObject()` veya `KeWaitForMultipleObjects()` fonksiyonları çağırılırken bekleme zamanı sıfır olarak seçilmelidir. Bu yapıldığında fonksiyon bahsi geçen nesneyi elde etmeye/sinyallemeye çalışacak, eğer yapamazsa beklemek yerine hemen geri dönecektir. Bu tür bir bekleme çağrısı aslında o nesne için beklemeyeceğinden dolayı `DISPATCH_LEVEL` seviyesinde güvenle yapılabilir.

Bu özellik sayesinde belirli bir nesnenin durumunu belirleyip ona göre aksiyon alabilirsiniz. Örneğin bir DPC rutininde bir iş yapmanız gerek diyelim. Bu rutindeyken sıfır bekleme ile bir nesnenin durumuna bakarak eğer sinyallenmiş ise istediğiniz işi yapabilir, sinyallenmemiş ise daha sonra belirlenen işi yapmak üzere bir iş öğesi (*work item*) oluşturabilirsiniz yahut DPC rutininde daha başka bir işlem yapabilirsiniz. İş öğeleri `PASSIVE_LEVEL` seviyesinde çalıştığı için dilediğiniz kadar bekleme imkanınız olduğunu da ekleyelim.

#### Uyarılar ve bekleme modları

`KeWaitForSingleObject()` ve `KeWaitForMultipleObjects()` fonksiyonlarının *Alertable* ve *WaitMode* parametreleri sistemin bu fonksiyonlar ile yapılan bekleme sırasında kullanıcı modu APClerine karşı nasıl tepki alacağını belirlemede rol oynar. Aşağıda bu parametrelere verilen değerlere göre oluşan sonuçları görebilirsiniz.

![](/files/alertmode-ve-waitmode-degerleri.png)

İşletim sistemi APClerin alımını çoğunlukla uyarılabilir bir beklemenin ardından çekirdek modundan kullanıcı moduna dönüşte yapar. Kullanıcı modu APCleri kullanıcı modu kodunun çalışmasını bölmezler. Bir uygulama belirli bir işlemcik bir kullanıcı modu APCsi sıraya koyarsa, uygulama bu APCyi çalıştırmak için bekleme fonksiyonlarından birini **Alertable** parametresi *TRUE* olarak çağırabilir.

Eğer sürücü `KeWaitForSingleObject()` veya `KeWaitForMultipleObjects()` fonksiyonunu **Alertable** parametresi *FALSE*, **WaitMode** parametresini de **UserMode** olarak çağırırsa bu bekleme eğer bir kullanıcı modu APCsi sıradaysa `STATUS_USER_APC` veya `STATUS_ALERTED` ile sonlanır. İşlemcik çekirdek modundan kullanıcı moduna döndüğünde sistem otomatik olarak bu APCleri alıp çalıştırır. Kullanıcı modu uygulaması bekleme yapılırken açıkça kullanıcı modu APCsi almayı istememişse, sürücüde yapılan **KeWaitXxx** fonksiyon çağrılarında **Alertable** parametresi *TRUE*, **WaitMode** parametresi ise **UserMode** değeri kullanılmamalıdır.

Eğer sürücü `KeWaitForSingleObject()` veya `KeWaitForMultipleObjects()` fonksiyonunu WaitMode parametresini **UserMode**, fakat **Alertable** parametresini *FALSE* olarak belirlerse ve söz konusu işlemcik sonlandırılmaya başlarsa bekleme `STATUS_USER_APC` ile biter. Fakat, sürücü bu beklemeyi `PASSIVE_LEVEL` seviyesinde ve kritik alan (*critical section*) içerisinde yapmamalıdır.

Bekleme modu ayrıca işlemciğin çekirdek modu yığınının beklem sırasında diske alınma durumunu da belirler. Eğer **WaitMode** değeri **UserMode** ise, işletim sistemi bekleme sırasında işlemciğin çekirdek modu yığınını diske alabilir. **UserMode** durumunda bekleme yapma yalnızca sürücü yığınında tek sürücü olduğunda güvenlidir. Eğer sürücü yığınında birden fazla sürücü varsa bunlardan biri yığın üzerindeki bir değeri değiştirmeye çalışabilir bu da sayfa hatası (*page fault*) oluşturur. Eğer bu sırada sürücü *IRQL* = *DISPATCH_LEVEL* veya daha yüksek bir seviyede çalışıyorsa bu hata çözülemez ve sistem çöker.

### Olaylar (Events)

Sürücüler olayları çekirdek modu işlemcikleri veya çekirdek modu ile kullanıcı modu arasında eşzamanlama yapmak için kullanırlar. Hem kullanıcı modu hem de çekirdek modunda olay nesnesi oluşturulabilir. Bunun dışında Windows işletim sistemi `\\KernelObject` isimli nesne dizininde birkaç tane önceden oluşturulmuş olay nesnesi tutmaktadır. Sürücüler gerekli durumlarda bu olay nesnelerini de kullanabilirler.

Bir olay nesnesi `KEVENT` tipinde bir eşzamanlama nesnesidir, ve diske alınamaz bir alandan tahsis edilmesi gerekir. Olay nesneleri isme sahip veya isimsiz olabilir. Sürücüler genelde isme sahip olayları diğer işlemlerle (mesela kullanıcı modundaki başka bir işlem veya başka bir sürücü) eşzamanlama yapmak için kullanırlar. Temelde ise sürücüler isimsiz olay nesnelerini kullanırlar. Windows işletim sistemi iki çeşit olay nesnesi sunar : bilgilendirme olayları ve eşzamanlama olayları. Bu ikisi arasındaki fark sinyalleme gerçekleştiği sırada meydana çıkar.

Bu iki türden birinde isimsiz bir olay nesnesi oluşturmak için, diske alınamaz bir alanda `KEVENT` nesnesi için alan tahsis edilir. Ardından sürücü `KeInitializeEvent()` fonksiyonu ile bu olay nesnesini kullanıma hazır hale getirir. İsimli bir olay nesnesi oluşturmak için sürücü `IoCreateNotificationEvent()` veya `IoCreateSynchronizationEvent()` fonksiyonunu çağırabilir.

Olayı sinyallemek için sürücü 3 adet parametreye sahip olan `KeSetEvent()` fonksiyonunu kullanır. Bunlardan biri olay nesnesine işaretçi, diğeri öncelik arttırma bilgisi, sonuncusu ise Wait isimli mantıksal bir parametredir. **Wait** parametresini *TRUE* yapmak, sürücü `KeSetEvent()` fonksiyonunu çağırdıktan hemen sonra bir **KeWaitXxx** fonksiyonu ile bekleme yapacak demektir. Bu parametre sürücünün hemen bir çekirdek "*dispatcher*" nesnesi bekleyeceği durumlarda iyileştirme sağlar.

Normalde sürücüler `KeSetEvent()` fonksiyonunu **Wait** parametresi *FALSE* olarak çağırırlar. Bu parametre *FALSE* olduğunda, `KeSetEvent()` *IRQL* seviyesini `DISPATCH_LEVEL`'e çıkarır, "*dispatcher*" veritabanının kilidini alır, olay nesnesinin sinyallenme durumunu günceller, bekleyen diğer beklemeleri işler, "*dispatcher*" veritabanının kilidini bırakır ve tekrar *IRQL* seviyesini eski haline döndürüp geri döner.

Eğer **Wait** parametresi *TRUE* ise, bu durumda `KeSetEvent()` fonksiyonu "*dispatcher*" veritabanının kilidini bırakmaz (çünkü hemen sonrasında bekleme yapılacağı için bu kilit tekrar alınacaktır) veya *IRQL* seviyesini düşürmez. Bu iyileştirme gereksiz bağlam alanı değişimlerini (*context switch*) önler. Eğer sürücü bu özelliği kullanırsa, `KeSetEvent()` fonksiyonunu *IRQL* < *DISPATCH_LEVEL* durumunda ve olay nesnesini oluşturan işlemcikte çağırmak zorundadır.

Üretici/tüketici senaryosunu kullanan bir sürücü rutini belki bu özelliği kullanabilir. Bu tarz sürücüler iki adet olay nesnesi kullanırlar genelde. Veri oluşturan sürücü rutini veri göndermeye hazır olduğunu belirtmek için olaylardan birini sinyaller. Ardından hemen ikinci olay nesnesini başka bir işlemcik tarafından sinyallenmesi için beklemeye başlar. İşlemcik, sürücüden veriyi alınca veriyi aldığını belirtmek için ikinci olay nesnesini sinyaller ve böylece yeniden veri alabileceğini sürücüye bildirmiş olur. Sürücüler bu özelliği yalnızca G/Ç isteğini oluşturan işlemcik ile aynı bağlam alanında çalışıyorsa kullanmalıdır, böylece kendisiyle alakasız olan işlemciklerin engellenmesi önlenmiş olur.

#### Bilgilendirme olayları (Notification events)

Bilgilendirme olayı el ile sıfırlanmadığı sürece sinyallenmiş bir halde bekleyen olay eşzamanlama nesnesidir. Bu nesneyi bekleyen tüm işlemcikler nesne sinyallendiğinde çalışmaya devam ederler, birisi bu nesnenin sinyalini `KeResetEvent()` fonksiyonu ile sıfırlamazsa bu nesne sinyallenmiş olarak kalmaya devam eder.

Sürücüler bilgilendirme olaylarını genelde kendi oluşturup gönderdikleri bir IRP'yi beklemek için kullanırlar. Örneğin, bir sürücü belki `IoBuildDeviceIoControlRequest()` fonksiyonunu kullanarak kendinden aşağıda bulunan bir sürücüye G/Ç isteği paketi gönderebilir. Bu fonksiyonun parametrelerinden biri bir olay nesnesine işaretçidir. Sürücü IRP'yi oluşturup gönderdikten sonra bu olay nesnesini bekler. IRP tamamlandığında G/Ç yöneticisi (*I/O Manager*) beklenilen nesneyi işaretler, böylece sürücü IRP'nin işlenmiş olduğunu anlar. Bu bilgilendirme olayı nesnesi KeResetEvent kullanılarak tekrar sinyallenmemiş haline döndürülmelidir.

#### Eşzamanlama olayları (Synchronization events)

Bu tür olaylar aynı zamanda otomatik sıfırlanan olaylar diye de adlandırılırlar. İsminden anlaşılabileceği gibi bu tür nesneler tek bir işlemciği uyandırır ardından otomatik olarak tekrar sıfırlanırlar. Bu tür nesneler bilgilendirme olaylarına göre daha nadir kullanılırlar.

Aygıtının hazır hale getirilmesi çok uzun süren bir sürücü `StartDevice` rutininde uzun süre bir eşzamanlama olayını beklemek zorunda kalabilir. Sürücünün `DpcForIsr` rutini, aygıt ilk defa kesme çalıştırdığında ve `DISPATCH_LEVEL` seviyesindeki işlemler bittiğinde bu olay nesnesini sinyaller. Ardından kontrol tekrar `StartDevice` rutinine döner ve sürücünün hazırlanması devam eder. Veya buna benzer olarak, sürücü aygıtını durdurmadan veya silmeden önce `DispatchPnp` rutininde G/Ç işleminin tamamlanmasını bir eşzamanlama olayı nesnesi ile bekleyebilir.

#### Kullanıcı modu uygulamaları ile eşzamanlama

Çekirdek modu sürücüleri kullanıcı modu fonksiyonlarını çağıramazlar. Fakat bazı durumlarda sürücünün kullanıcı modunda çalışan bir uygulamayı gerçekleşen bir durum hakkında bilgilendirmesi gerekebilir. Bu tür durumlarda birkaç yöntem kullanılabilir.

Bu yöntemlerden biri kullanıcı modu uygulaması ve çekirdek modu sürücüsü ile ortaklaşa kullanılan bir olay nesnesi oluşturmaktır. Bunun için öncelikle sürücüde şunlar yapılır:

1. Kullanıcı modunun olayı gönderebileceği bir IOCTL kodu tanımlayın
2. `IRP_MJ_DEVICE_CONTROL` isteklerini işleyecek olan bir fonksiyon tanımlayın.
3. `ObReferenceObjectByHandle()` fonksiyonunu kullanarak IOCTL ile size ulaşan tutamak değerini doğrulayın. **DesiredAccess** parametresi için *SYNCHRONIZE*, **ObjectType** için ise `*ExEventObjectType` değerini kullanın.
4. Olayı sinyallemek için `KeSetEvent()` fonksiyonunu, sıfırlamak için `KeResetEvent()` fonksiyonunu kullanın.
5. Olay nesnesi artık kullanılmadığında ise `ObDereferenceObject()` fonksiyonu ile başvurma sayısını azaltın.

Kullanıcı modunda ise:
1. `CreateEvent()` fonksiyonunu kullanarak bir olay nesnesi oluşturun.
2. `DeviceIoControl()` fonksiyonunu ve tanımladığınız IOCTL kodunu kullanarak bu olayın tutamak değerini sürücüye gönderin.
3. Artık olay nesnenizi kullanabilirsiniz. Bekleme yapmak için `WaitForSingleObject()` veya `WaitForMultipleObjects()` fonksiyonunu kullanın.
4. Uygulamadan çıkmadan önce `CloseHandle()` fonksiyonu ile olay nesnesini silin.

Bu yöntem sürücü ile kullanıcı moduna çalışan uygulama aynı işlemin bağlam alanında (*process context*) çalıştığında geçerlidir. Fakat, unutmayın ki katmanlı sürücü modeli kullanıldığında genelde sürücüler aynı işlemin bağlam alanında çağırılmazlar.

Bağlam alanı ile ilgili sorunu çözmek için daha genel bir yöntem `DeviceIoControl()` fonksiyonunu herhangi bir olay nesnesi olmadan kullanmaktır. Bu yöntemde kullanıcı modu uygulaması `DeviceIoControl()` fonksiyonunu ayrı bir işlemcikte gönderir, bu durum geriye `STATUS_PENDING` kodunu döndürür. Kullanıcı modunu bilgilendirmek için sürücü bu isteği tamamlar böylece kullanıcı modundaki uygulama haberdar olmuş olur. Bu yöntemde bağlam alanı sorun çıkarmayacağı için düşük seviyedeki sürücülerde kullanılabilir.

### Çekirdek muteksleri (Kernel mutexes)

Çekirdek muteksleri genelde yalnızca muteks ismiyle anılırlar. Bu nesneler diske alınabilir kodlarda yapılan eşzamanlama işlemleri için kullanışlıdırlar. Bir çekirdek muteksi, işlemciğin koruduğu veriye güvenli bir şekilde erişebilmesine olanak sunar. Sürücüler *IRQL* <= *APC_LEVEL* olması durumunda çekirdek mutekslerini kullanabilirler.

Çekirdek muteksleri işlemcik bağlam alanına bağlıdır. Çekirdek muteksleri kullanan sürücüler genelde G/Ç isteğini yapan işlemciğin bağlam alanında çalışan yüksek seviyeli sürücülerdir. Bir muteksi elde eden işlemcik, o muteksi yine aldığı sıradaki işlemcik bağlam alanında bırakmalıdır.

Çekirdek muteksleri hızlı mutekslerden şu farklarla ayrılır:

* Çekirdek muteksleri özyinelemeli olarak alınabilir, hızlı muteksler alınamaz.
* Çekirdek muteksleri `KeWaitForSingleObject()`, `KeWaitForMultipleObjects()` ve `KeWaitForMutexObject()` ile elde edilir. Hızlı muteksler ise `ExAcquireFastMutex()`, `ExTryToAcquireFastMutex()` ve `ExAcquireFastMutexUnsafe()` fonksiyonları ile alınır.
* Çekirdek muteksleri sistem genelinde etkin olan "*dispatcher*" veritabanının kilidini elde eder, hızlı muteksler ise buna ihtiyaç duymaz.

Sürücülerde çekirdek mutekslerini kullanabilmek için şunlar yapılmalıdır:

1. Diske alınamaz bir hafıza alanında `KMUTEX` yapısı için alan ayırın.
2. Muteksi kullanılabilir hale getirmek için `KeInitializeMutex()` fonksiyonunu çağırın.
3. `KeWaitForSingleObject()`, `KeWaitForMultipleObjects()` veya `KeWaitForMutexObject()` fonksiyonunu kullanarak muteksi bekleyin.
4. Korunan veri üzerinde gereken işlemleri yapın.
5. `KeReleaseMutex()` fonksiyonunu kullanarak muteksi bırakın.

İşletim sistemi oluşturulan tüm çekirdek mutekslerini sinyallenmiş olarak işaretler. Bu nedenle muteks için yapılan ilk elde etme denemesi hemen gerçekleşir.

Sürücüler çekirdek muteksleri için bekleme yaptıklarında her zaman **KernelMode** parametresini kullanmalıdır. Çekirdek modunda bir bekleme yapmak işlemciğin çekirdek modu yığınının diske alınmasını önler, ayrıca kullanıcı modu ve normal çekirdek modu APClerinin alınmasını devre dışı bırakır: bu sayede işlemcik duraksatılamaz veya sonlandırılamaz. Özel çekirdek modu APCleri ise alınmaya devam eder. Yapısal olarak bir çekirdek muteksinin alınması sırasında `KeEnterCriticalRegion()` fonkiyonu çalıştırılır. Eğer muteks alınması sırasında *IRQL* `PASSIVE_LEVEL` seviyesinde çalışıyorsa, bu fonksiyon çağrısı muteks bırakılana dek normal çekirdek modu APClerini devre dışı bırakır. Eğer işlemcik muteksi aldığı sırada `APC_LEVEL` seviyesinde çalışıyorsa kritik alana girilmesi bir etki oluşturmaz çünkü normal çekirdek modu APCleri zaten devre dışı durumda olur (Çünkü `APC_LEVEL` seviyesi bunu engeller).

Bir muteksi tutan işlemcik kullanıcı moduna dönmeden önce o muteksi bırakmalıdır, dönüş sırasında muteks bırakılmamışsa sistem çöker. Örneğin, en üst seviyedeki sürücü kullanıcı modu için bir G/Ç isteği işliyorsa bu istek bitip kullanıcı moduna dönülmeden önce o muteksi bırakmalıdır.

İşlemcik bir muteksi bırakırken **Wait** parametresini kullanır. Bu parametre `KeReleaseMutex()` fonksiyonunda tıpkı `KeSetEvent()` fonksiyonunda olduğu gibi çalışır. Ayrıntılar için Olaylar kısmına göz atabilirsiniz.

Bir çekirdek muteksini özyinelemeli olarak alan bir işlemcik, aldığı kadar geri bırakmak zorundadır. Tüm bırakmalar gerçekleşmeden işletim sistemi muteksi sinyallemez ve `KeLeaveCriticalRegion()` fonksiyonunu çağırıp kritik alandan çıkış yapmaz.

### Semaforlar

Semaforlar mutekslere benzer. Fakat semaforlardan birden fazla kez kilidi alabilme imkanı vardır. Kilidin ne kadar alınabileceği semafor oluşturulduğu sırada belirlenir. Örneğin birkaç tane işlemciğin bir veriyi ortaklaşa kullandığı durumlarda semaforlar kullanışlı olabilir.

Tüm semaforlar sınır(*limit*) ve sayaç(*count*) değerlerine sahiptir. Sınır bize semaforun en fazla kaç defa kaç işlemcik tarafından alınabileceği gösterir. Sayaç değeri ise o anda kaç adet işlemciğin semaforu aldığını gösterir.

Örneğin bir sürücü birkaç tane tampon bellek ayırıp bunları bir semafor ile koruyabilir. Semaforun sınır değeri kaç adet tampon bellek var ise ona ayarlanır. Eğer sürücü bu tampon belleklerden birine ihtiyaç duyarsa semaforu elde etmek için bekler. Eğer bu semaforun sayaç değeri sıfır ise, tüm tampon bellekler kullanımda demektir, eğer sayaç değeri semaforun sınır değerine eşitse tüm tampon bellekler kullanılabilir demektir.

Sürücülerde semafor kullanmak için şu yol izlenebilir:

1. Diske alınamaz bir alanda bir `KSEMAPHORE` yapısı için hafıza alanı tahsis edin.
2. `KeInitializeSemaphore()` kullanarak semaforu kullanmaya hazır hale getirin. Fonksiyonun **Count** parametresinin 0 olması semaforu sinyallenmemiş bir şekilde oluşturmaya neden olur; sıfırdan büyük bir değer ise semaforu sinyallenmiş bir şekilde oluşturur ve kaç adet işlemciğin bu semaforu alabileceğini gösterir.
3. `KeWaitForSingleObject()` veya `KeWaitForMultipleObjects()` fonksiyonu ile semaforu bekleyin.
4. Korunan veri üzerinde işlemleri gerçekleştirin.
5. `KeReleaseSemaphore()` fonksiyonu kullanarak semaforu bırakın.

Eğer sürücü semaforun sayaç değerini sınır değerinin üzerine çıkarırsa, sistem bir istisna (*exception*) oluşturur. Bu tarz bir hata eğer sürücü semaforu birçok kez bırakmaya çalışırsa oluşur. Bu durum olay nesnelerindekinden farklıdır, olay nesnelerinde sinyallenmiş bir olayı tekrar sinyallemek etki oluşturmaz.

İşlemcik semaforu bırakırken bir **Wait** parametresi değeri belirleyebilir. Bu parametre tıpkı muteks ve olaylardaki gibi bir etkiye sahiptir. Bunun için ilgili bölümlere tekrar bakabilirsiniz.

Bir semaforun durumunu öğrenmek için `KeReadStateSemaphore()` fonksiyonu kullanılabilir.

### Sayaçlar/Zamanlayıcılar (Timer)

Olaylar gibi zamanlayıcılar da eşzamanlama veya bildirim oluşturma için kullanılabilir. Sürücü, bildirim zamanlayıcısı oluşturmak için `KeInitializeTimer()` fonksiyonunu, bildirim veya eşzamanlama zamanlayıcısı oluşturmak için ise `KeInitializeTimerEx()` fonksiyonunu kullanabilir.

Her iki zamanlayıcı da göreceli ya da kesin bir zaman diliminden sonra zaman aşımına uğrar. Kesin zamanlar 100 nanosaniye cinsinden ve verilir. Göreceli olanlar ise negatif zaman değerleridir, bunlar da 100 nanosaniye cinsinden belirtilirler. Bir bildirim zamanlayıcısı zaman aşımına uğradığında sinyallenir ve onu beklemekte olan tüm işlemcikleri uyandırır. `KeSetTimer()` fonksiyonu tekrar kullanılana kadar bu zamanlayıcı sinyallenmiş durumda kalmaya devam eder. Bir eşzamanlama zamanlayıcısı ise zaman aşımına uğradığında bir işlemciği uyandırır ve işletim sistemi tarafından tekrar sinyallenmemiş haline sıfırlanır.

Sürücüler zamanlayıcıları *IRQL* <= *APC_LEVEL* olması durumunda bekleyebilirler.

Bir zamanlayıcı kullanmak için kabaca şunlar yapılabilir:

1. Diske alınamaz bir hafıza alanında `KTIMER` yapısı için alan tahsis edin.
2. `KeInitializeTimer()` veya `KeInitializeTimerEx()` kullanarak zamanlayıcıyı hazır hale getirin. `KeInitializeTimer()` kullanırsanız bildirim zamanlayıcısı, `KeInitializeTimerEx()` kullanırsanız hem bildirim hem de eşzamanlama zamanlayıcısı oluşturabilirsiniz.
3. `KeSetTimer()` veya `KeSetTimerEx()` fonksiyonlarını zamanlayıcının ne zaman biteceği ile ilgili bir değer kullanarak zamanlayıcı başlatın.
4. Bir zamanlayıcıyı beklemek için `KeWaitForSingleObject()` veya `KeWaitForMultipleObjects()` fonksiyonlarını kullanın.
5. Bir zamanlayıcıyı zaman aşımına uğramadan önce durdurmak için `KeCancelTimer()` fonksiyonunu kullanın.
7. Bir bildirim zamanlayıcısını zaman aşımına uğradıktan sonra sıfırlamak için `KeSetTimer()` fonksiyonunu kullanın. 

Hem bildirim hem de eşzamanlama zamanlayıcıları periyodik olabilirler. Bu tür zamanlayıcılar zaman aşımına uğradıklarında işletim sistemi tarafından hemen tekrar başlatılırlar.

### İşlemcikler, işlemler ve dosyalar	

İşlemcikler, işlemler ve hatta dosyalar da çekirdek "*dispatcher*" nesnelerindendir. Sürücüler **KeWaitXxx** fonksiyonları kullanarak bu nesneler üzerinden eşzamanlama yapabilir. Örneğin bir işlemciğin veya işlemin bitirilmesini bekleyebilirsiniz. Dahası, bir sürücü oluşturulan yeni işlemcik ve işlemler sırasında bildirim almayı isteyebilir.

Herhangi bir işlem, işlemcik veya dosya kullanarak eşzamanlama yapabilmek için o nesneye (bunların her biri bir nesnedir) bir işaretçiye ihtiyaç vardır. Örneğin `PsCreateSystemThread()` ile oluşturulan bir işlemciğin tutamak değeri (*handle*) bu fonksiyonun geri dönüş değerinden elde edilebilir. Ardından bu tutamak `ObReferenceObjectByHandle()` fonksiyonuna verilerek o işlemcik nesnesine ait asıl işaretçi elde edilir. Yine aynı şekilde herhangi bir dosya ile işlem yaparken elde edilmiş olan tutamak değeri `ObReferenceObjectByHandle()` fonksiyonuna verilerek o dosyaya ait nesne işaretçisi elde edilebilir. Bu işlemler sonucunda elde edilen nesne işaretçisi **KeWaitXxx** fonksiyonları ile kullanılarak o nesne beklenebilir. 

Bir işlem, işlemcik veya dosya nesnesi üzerinde beklemek için **KernelMode** parametresi ile bekleme yapılmalıdır. Çekirdek modunda beklemek yapmak bekleme yapan işlemciğin çekirdek modu yığınının diske alınmasını ve kullanıcı modu ve normal çekirdek modu APClerinin işlenmesini önler. Bu tür bir bekleme işlemci veya işlem sonlandığında, dosya ile ilgili G/Ç işlemi tamamlandığında biter.

Bir dosya G/Ç işlemi (yani bir tane IRP söz konusu) söz konusu dosya nesnesinin içerisinde bulunan bir olay nesnesi işaretlendiğinde biter. Tüm dosya nesneleri bu olay nesnesine sahiptir. Bu olay nesnesi bir eşzamanlama nesnesidir (yani otomatik olarak tekrar sıfırlanır). Eşzamanlı olmayan bir G/Ç işlemi yapan sürücü veya uygulamalar bu olay nesnesini bekleyerek işlemin tamamlandığını anlayabilirler.

Herhangi bir işlemcik ile eşzamanlama yapmak aygıta ait işlemciklerle uğraşan sürücüler için kullanışlıdır. Çoğu sürücü rutinleri, yüksek sevileyi sürücülerin G/Ç işleme rutinleri hariç, kendisine yabancı bir işlemciğin bağlam alanında çağırılır. Bu sebeple o anki işlemciğin bağlam alanında işlemikleri kullanarak eşzamanlama yapmak genelde anlamsız olarak kabul görür.

Sürücüler bir işlem veya işlemcik oluşturulduğunda veya silindiğinde bildirim alabilirler. Bunu yapmak için sürücü `PsSetCreateProcessNotifyRoutine()` veya `PsSetCreateThreadNotifyRoutine()` fonksiyonlarını kullanarak bir geriçağırım fonksiyonu kaydeder. İşletim sistemi, işlem veya işlemcik oluşturulduğunda bu kaydedilen fonksiyonu otomatik olarak çağırır.

## Yönetim kaynakları (Executive resources)

Yönetim kaynaklarını kullanarak sürücüler okuma/yazma kilidi elde edebilirler. Bu nesneler veri yapılarının yalnızca bir işlemcik tarafından özel izne sahipken diğerleri tarafından okunabileceği durumlar için tasarlanmıştır. Bu nesneler işletim sisteminin "*dispatcher*" veritabanı ile yönetilmezler bu nedenle genelde diğer çekirdek "*dispatcher*" nesnelerinden daha hızlıdırlar. Herhangi bir işlemcik yönetim kaynağını özel veya ortak bir izin için elde edebilir. `PASSIVE_LEVEL` veya `APC_LEVEL` seviyesinde çalışan kodlar yönetim kaynaklarını kullanabilirler.

Yönetim nesneleri `ERESOURCE` veri yapısı ile tanımlanır. Bu yapı diske alınmaz bir alandan ayrılmak zorundadır. Aşağıdaki tabloda yönetim kaynaklarını elde etmede kullanılabilen fonksiyonları görebilirsiniz.

![](/files/yonetim-kaynagi-alma-fonksiyonlari.png)

Eğer bir işlemcik yönetim kaynağını özel olarak elde ederse, daha sonra bunu ortak bir elde etmeye dönüştürebilir. Buna karşın ortak izin için elde edilmiş bir yönetim kaynağı, daha sonra özel izne dönüştürülemez. `ExConvertExclusiveToSharedLite()` fonksiyonu elde edilmiş olan özel izni ortak izne çevirir.

Bir işlemcik başka bir işlemcik adına elde edilmiş izni `ExReleaseResourceForThread()` fonksiyonunu kullanarak bırakabilir. Dosya sistem sürücüleri bu fonksiyonu kullanır örneğin. Yani, bir işlemcik yönetim kaynağını elde edip bir G/Ç işlemini yapmak için bu IRP'yi başka bir işlemciğe gönderebilir. Bu yeni işlemcik, ilk işlemcik adına bu fonksiyon sayesinde kaynağı bırakabilir.

Sürücüler `ExIsResourceAcquiredLite()`, `ExIsResourceAcquiredSharedLite()` ve `ExIsResourceAcquiredExclusiveLite()` fonksiyonlarını kullanarak söz konusu yönetim kaynağının herhangi bir işlemcik tarafından elde edilip edilmediğini gösterebilir. Dahası, sürücüler `ExGetSharedWaiterCount()` ve `ExGetExclusiveWaiterCount()` fonksiyonlarını kullanarak bir yönetim kaynağı için kaç adet işlemciğin beklediğini öğrenebilir.

Yönetim kaynağını elde etmiş durumda olan bir işlemciğin sonlandırılması sistemin çökmesine sebebiyet verebilir. Örneğin **A** işlemciğinin yönetim kaynağına ortak izne sahip olduğunu düşünün, **B** işlemciği ise bu yönetim kaynağına özel izinle sahip olmak için bekliyor olsun. Eğer **A** işlemciği sonlandırılırsa, **B** işlemciği çok uzun bir süre bu izne sahip olmak için bekleyebilir ve bu da sistemin çökmesine sebep olabilir. Bu tür durumlara karşı önlem almak için yapmanız gerekenleri "*Güvenlik sorunları*" isimli bölümde bulabilirsiniz.

## Yönetim kaynağını kullanmak için sürücü şunları yapmak zorunda

1. Diske alınamaz bir hafıza alanından `ERESOURCE` yapısı için alan ayırın.
2. `ExInitializeResourceLite()` fonksiyonunu kullanarak kaynağı kullanılmaya hazır hale getirin. Bunu genelde `DriverEntry` veya `AddDevice` rutinlerinde yapabilirsiniz.
3. Kaynağı kullanmadan önce normal çekirdek modu APClerini devre dışı bırakın. Normal sürücüler bunun için `KeEnterCriticalRegion()` fonksiyonunu; dosya sistemi sürücüleri ise `FsRtlEnterFileSystem()` fonksiyonunu çağırırlar.
4. Yukarıda belirtilen fonksiyonlardan birini kullanarak kaynağı kullanın.
5. Korunan veri üzerinde gerekli işlemleri yapın.
6. `ExReleaseResourceLite()` fonksiyonunu kullanarak kaynağı serbest bırakın.
7. Normal çekirdek modu APClerini `KeLeaveCriticalRegion()` veya `FsRtlLeaveFileSystem()` fonksiyonunu kullanarak tekrar etkinleştirin.

Kaynakların alınması için kullanılan fonksiyonlar kaynağın alınma durumunu bildiren bir *Boolean* değeri geri döner. Eğer kaynak alınabilirse bu değer *TRUE*, eğer bahsi geçen kaynak uygun değilse *FALSE* değeri döner.

Hızlı muteksler ve döngü kilitlerin aksine, yönetim kaynakları özyinelemeli olarak alınabilir. Bir yönetim kaynağını özyinelemeli olarak alan işlemcik, aldığı kadar geri bırakma işlemi yapmak zorundadır. Bu özyinelemeli kullanım genellikle dosya sistemi sürücülerinde kullanılır. Örneğin, bir dosya sistemi sürücüsü sanal hafızada ayrılan bir alana dosyaları eşleyerek (*map*) bir önbellekleme mekanizması oluşturmuş olabilir. Sürücü bu önbellekteki veriyi işlerken gerekli sayıda da kilit tutar. Eğer bu işleme sırasında bir sayfa hatası oluşursa işletim sistemi yeni bir G/Ç isteği oluşturur. Oluşan bu isteği yanıtlayabilmek için daha önce önbellekleme mekanizmasında kullanılan kilitlerin özyinelemeli olarak alınması gerekebilir.

## Geriçağırım nesneleri (Callback objects)

Geriçağırım nesneleri çekirdek modu rutinleri arasında eşzamanlama yapmak için elverişlidirler. Geriçağırım nesneleri çekirdek moduna özeldir, kullanıcı modu uygulamaları ile paylaşılamazlar.

Sürücü bir geriçağırım nesnesi oluşturmak için `ExCreateCallback()` fonksiyonunu kullanır. Bu nesneyi kullanan kişiler ise `ExRegisterCallback()` fonksiyonu ile bir geriçağırım fonksiyonu kaydederler. Sürücü tarafından belirlenen koşul oluştuğunda sürücü `ExNotifyCallback()` fonksiyonunu çağırarak kaydedilen fonksiyonları çalıştırır. `ExNotifyCallback()` fonksiyonu *IRQL* <= *DISPATCH_LEVEL* olması durumunda çağırılabilir, çağırılan fonksiyonlar ise `ExNotifyCallback()` fonksiyonu ile aynı *IRQL* seviyesinde ve aynı işlemciğin bağlam alanında çalışırlar.

## Sürücü tarafından tanımlanan kilitler

İşletim sistemi tarafından sunulan eşzamanlama nesnelerinin dışında sürücüler kendi kilit mekanizmalarını oluşturabilir. Eğer kendi kilit mekanizmanızı oluşturacaksanız şunu bilmelisiniz ki bazı donanım mimarileri ve derleyiciler okuma ve yazma komutlarını performansı arttırmak için tekrar sıralayabilir. Bu tür bir tekrar sıralamayı önlemek için sürücüdeki kod bazı durumlarda bir hafıza bariyerine (*memory barrier*) ihtiyaç duyar.

Bir *hafıza bariyeri* okuma ve yazma işlemlerinin sırasını koruyan bir işlemci komutudur. İşletim sisteminin kilitleme mekanizmaları (döngü kilitler, hızlı muteksler, çekirdek "*dispatcher*" nesneleri ve yönetim kaynakları) bu hafıza bariyerleri kullanılarak oluşturulmuştur.

Eğer kendi kilit mekanizmanızı oluşturursanız doğru sonucu alabilmek için, kilitlenen koda hafıza bariyerleri koymanız gerekebilir. **ExInterlockedXxx** ve **InterlockedXxx**, `KeMemoryBarrier()` ve `KeMemoryBarrierWithoutFence()` fonksiyonları okuma yazma işlemlerinin tekrar sıralanmasını önlemek için hafıza bariyerleri koyar.

## Aynı anda çoklu eşzamanlama mekanizması kullanmak

Eğer yanlış şekilde yapılırsa birden fazla kilitleme nesnesinin alınması sistemin kilitlenmesine sebep olabilir. Bu nedenden dolayı sürücü geliştiricilerine birden fazla kilidi aynı anda almak önerilmez. Yine de, bazı durumlarda birden fazla kilit almak iyi bir fikir olabilir ve hatta gerekli olabilir.

Örneğin, `DISPATCH_LEVEL` seviyesinde korunması gereken iki liste olduğunu düşünelim. Sürücüdeki kodlar genelde, aynı anda bu listelerden sadece birine erişir. Fakat bazı durumlarda bir fonksiyonun bu listeler arasında taşıma yapması gerekebilir. Bir döngü kilit ile iki listeyi korumak bu tür durumda yetersiz olur.

Bu durumda en uygun seçenek iki liste için ayrı birer döngü kilidi kullanmaktır. **A** listesine erişen kod, bu listeyi koruyan **A** döngü kilidini alır. **B** listesine erişen kod ise bu listeyi koruyan **B** döngü kilidi alır. Bu iki listeye birden erişen kod ise iki kilidi birden alır. Fakat, burada kilitlenmeyi önlemek için bu kilitlerin alım ve geri verim sırası aynı olmalıdır.

## Kilitlenmeleri önleme

Bir kilitlenme genelde sürücü asla elde edemeyeceği bir şeyi beklediği/elde etmeye çalıştığı zamanlarda oluşur. Örneğin bir döngü kilidini tutan işlemcik tekrar aynı döngü kilidini elde etmeye çalışırsa kilitlenir. Böyle bir durumda işlemcik kendi tuttuğu kilidi bırakana dek oldukça uzun bir süre bekleyecektir.

2 tane işlemcik ikili bir kilitlenme oluşturabilir. Örneğin ikisi de karışılıklı olarak birbirinin tuttuğu kilidi almaya çalışırsa bu durum oluşur. Örneklemek için bir sürücünün **A** ve **B** yapısını korumak için 2 adet döngü kilidi oluşturduğunu düşünün. 1. işlemcik **A** yapısını, 2. işlemcik ise **B** yapısını koruyan döngü kilidi almış olsun. Şimdi 1. işlemcik **B**, 2. işlemcik ise **A** yapısını koruyan döngü kilidi almaya çalışırsa bahsedilen ikili kilitlenme oluşur ve çözülemez. Bu tür durumlardan kurtulmak için sürücünüzde kullanığınız kilitlerde önem sırasına göre bir sistem kullanmalısınız.

Örneğin şunları göz önünde bulundurabilirsiniz:

* *IRQL* >= *DISPATCH_LEVEL* durumunda çağırılabilecek bir kod parçasında hiçbir zaman bir eşzamanlama nesnesi için beklemeye çalışmayın. Örneğin bu kod parçacıklarından biri de `IoCompletion` rutinleridir. Şüpheye düştüğünüzde o anki *IRQL* durumunu test etmek için `ASSERT()` makrosunu kullanabilirsiniz.
* Normal çekirdek modu APClerini herhangi bir kilidi alan fonksiyonu çağırmadan önce ve **KeWaitXxx** ile bir olay, semafor, zamanlayıcı/sayaç(timer), işlemcik, işlem üzerinde beklemeden önce devre dışı bırakın.
* Sürücü doğrulayıcı (**verifier.exe**) kullanın. Bu araçtaki kilitlenme bulucu kilitlenme durumlarını bulmanıza yardımcı olacaktır.
* Her zaman için sürücünüzde önem durumuna göre belirli bir kilit alma/bırakma sırası belirleyin.

## Güvenlik sorunları

Kritik alana girmeden kilitleme mekanizması kullanan işlemcikler, eğer kilidi bırakmadan sonlandırılırsa sorun yaratabilir. Bunun sebebi işlemciklerin sonlanması için normal çekirdek modu APCsi kullanılmasıdır. Kritik alana girilmeden kilit alındığı için işlemcik sonlandırılabilir ve bu da bahsi geçen durumu meydana getirir. Sürücü **KernelMode** olarak bir bekleme yapsa bile aşağıdaki durumlar geçerli olduğunda normal çekirdek modu APCleri işleyebilir.

* Hedef işlemcik `APC_LEVEL`'den düşük bir *IRQ* seviyesinde çalışıyorsa
* Hedef işlemcik bir APC çalıştırmıyorsa
* Hedef işlemcik bir kritik alanda değilse, bu **KeWaitXxx** fonksiyonu çağırılmadan önce `KeEnterCriticalRegion()` fonksiyonunun çağırılmaması demektir.

Not: Bahsi geçen sorun çekirdek muteksleri ve hızlı mutekslerde geçerli değildir çünkü işletim sistemi bu iki muteks türünü de elde etmeden önce kritik alana girer.

Şu senaryoyu örnek olarak verebiliriz:

Kullanıcı modundan gelen bir G/Ç işlemini yaparken sürücü bir çekirdek "*dispatcher*" nesnesini (muteks dışında) bekliyor olabilir. Sürücü uyarılabilir olmayan bir **KernelMode** beklemesi yapıyor diyelim, bu ise **WaitMode** parametresinin *KernelMode*, **Alertable** parametresinin ise *FALSE* olduğunu gösterir.

Bu G/Ç işlemini isteyen uygulamanın ikinci bir işlemcik oluşturduğunu düşünün. Eğer bu ikinci işlemcik bahsi geçen G/Ç işlemini yapan işlemciğe bir tutamak alabilirse bu işlemciği sonlandırabilir, bu da G/Ç işlemini yapan sürücünün ve muhtemelen tüm sistemin kullanılamaz duruma gelmesine sebep olur.

Bu tür güvenlik sorunlarının yaşamamak için sürücülerde **KeWaitXxx** fonkiyonları çağırılmadan önce kritik alana girilmelidir (böylece APCler devre dışı olur). APClerin durumunu sorgulamak için Windows XP'den itibaren kullanılabilen KeAreApcsDisabled fonksiyonu kullanılabilir. 

## Performans sorunları

Hemen hemen tüm sürücülerde döngü kilitleri ve diğer eşzamanlama nesnelerine ihtiyaç duyulsa da, bu nesneler yapıları gereği performansa zarar verebilirler. Eşzamanlama sırasında performans konusunda en az tavizi vermek için aşağıdaki öneriler üzerinde düşününüz. 

* Kilitleri *YALNIZCA* sahiden gerektiği zamanlarda kullanın. Örneğin sistem hakkında sayıtımsal bilgi edinmek istediğinizde işlemci başına ayrı ayrı olan sayıtım bilgilerini kullanın. Bütün sistemi ele alan sayıtım verileri muhtemelen bir kilitleme sistemi gerektirecektir.
* *IRQL* < *DISPATCH_LEVEL* olması durumunda okuma/yazma izni olan verileri korumak için yönetim kaynaklarını (`ERESOURCE` yapıları yani) kullanın. Bu sayede birkaç işlemcik okuma yapabilir.
* Mümkün olduğunda çekirdek "*dispatcher*" nesneleri yerine `ERESOURCE` yapılarını veya hızlı muteksleri kullanın. Çünkü bu ikisi "*dispatcher*" veritabanında tutulmamaktadır, işletim sistemi bu kilitleri bu veritabanının kilidini elde etmeden kullanabilir.
* Mümkün olduğunda **InterlockedXxx** fonksiyonlarını kullanın. Bu fonksiyonlar döngü kilidi kullanmadıkları için oldukça hızlıdırlar.
* Özellikle belirli bir sıklıkla döngü kilit alınıyorsa, sıradan döngü kilitler yerine sıralı döngü kilitleri tercih edin.
* "*Dispatcher*" kilidini kullanan fonksiyonları mümkün olduğunca az kullanın (Örneğin `KeWaitForSingleObject()`, `KeWaitForMultipleObjects()` ve `KeWaitForMutexObject()` gibi fonksiyonlar). Yine ayrıca çekirdek "*dispatcher*" nesnelerini sıfırlayan veya bırakan fonksiyonları da mümkün olduğunca az kullanın (`KeSetEvent()`, `KeReleaseSemaphore()` gibi).
* Bir döngü kilidini mümkün olduğunca kısa süre tutun.

## Sürücülerde eşzamanlama için öneriler

Geliştirdiğiniz sürücülerdeki eşzamanlama sorunlarından kurtulmak için aşağıdaki önerileri aklınızda veya sağda solda bir yerde bulundurunuz.

* Veriye ulaşılacak olan en yüksek *IRQL* seviyesinde çalışacak kodu belirleyin.
* Eğer bu kodlarında biri bile *IRQL* >= *DISPATCH_LEVEL* durumunda ise döngü kilitlerini (*spin locks*) kullanmanız gerek.
* Eğer bu kodlar `PASSIVE_LEVEL` veya `APC_LEVEL` seviyesinde çalışıyorsa ihtiyacınıza göre yönetim kaynakları (*executive resources*), hızlı muteksler veya herhangi bir çekirdek "*dispatcher*" nesnesi kullanabilirsiniz.
* Sürücüdeki eşzamanlamayı kullanıcı modu ile yapacaksanız kullanıcı modunda oluşturulan olayı sürücüye kaydettirmek için özel bir IOCTL tanımlayın.
* `PASSIVE_LEVEL` seviyesindeyken işlemciğin duraksatılmasını engellemek için bir çekirdek "*dispatcher*" nesnesi alınmadan önce (muteks hariç) veya yönetim kaynakları kullanmadan önce kritik bölgeye giriş yapmayı unutmayın.
* Listeleri yönetmek veya aritmetik-mantıksal işlemler yapmak için duruma göre **ExInterlockedXxx** veya **InterlockedXxx** fonksiyonlarını kullanın.
* Sürücülerinizi mümkün olduğunca farklı donanımlarda test edin. Özellikle çok işlemcili sistemlerde bulunan kilitlenme, eşzamanlama sorunlarını tespit etmek için sürücünüzü çok işlemcili bir sistemde test edin.
* Sürücü doğrulayıcı (**verifier.exe**) kullanın. Eşzamanlama ve *IRQL* ile ilgili sorunları tespit etmenizde oldukça yardımcı olacaktır.
* Alınan kilitleri ve değişen *IRQL* seviyelerini takip etmek için sürücü doğrulayıcının genel sayaçlarını kontrol edin.

Evet.. Sanırım bu kadar. Burada yazanlar şu andaki sisteme göre ufak tefek farklılıklar içeriyor olabilir belki eğer fark eden olursa lütfen belirtin hepsini tek tek kontrol edemedim çünkü. Ayrıca tabi ki bu konudaki tüm ayrıntıları bir yazıya sığdırmak imkansız ama genelde önerileri takip ettiğinizde sorunsuz bir şekilde geliştirme yapabilirsiniz.

Sonraki yazılarda bunlardan bazılarının kullanımının nasıl olduğunu(başka eşzamanlama nesneleri de var yeni çıkan, ama onlar yazıda ekli değil) ve işletim sistemi tarafında teknik olarak nasıl uygulandıklarını anlatan yazılar da yazabilirim bakalım, yazacak çoook şey var çooook...

Sevgiler.
