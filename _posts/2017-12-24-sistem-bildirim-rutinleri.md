---
title: Sistem Bildirim Rutinlerinin Özeti
---

Selamlar.

5 saat önce yazılardan birinde bir dostumuz Windows işletim sistemindeki bildirim rutinleri ile ilgili bir yazı yazarsak faydalı olacağını belirtmiş, zaten bir süredir motivasyon eksikliği yüzünden yazı yazmıyordum fakat bu mesajı görünce tekrar heveslendim ve ne kadar süreceğini bilmediğim için direk yazmaya başlıyorum. Sanırım Azerbaycan'dan yazan bir dostumuz, buradan Azerbaycan'daki okuyuculara da selam ve sevgilerimi gönderiyorum onun aracılığıyla...

Sistemdeki bildirim rutinleri dediğimizde ne demek istiyoruz? Şöyle ki, işletim sisteminde malumunuz gerçekleşen birtakım olaylar var, mesela işlem oluşturulması, işlemcik oluşturulması, kayıt defteri işlemleri, bilgisayarın kapatılması, nesneler üzerindeki işlemler gibi. İşletim sistemi geliştiricileri bu olayların olması sırasında geliştiricilere bu olayları takip edebilecekleri veya ona göre birtakım işlemler yapabilecekleri bir mekanizma sunmuşlar, bunlara da sistem bildirimleri diyoruz. Bu bildirimler bir çok uygulama tarafında kullanılır, örneğin VMware gibi sanallaştırma yazılımından tutun da, hemen hemen tüm anti-x uygulamaları bu sistem çağrılarını kullanmaktadırlar. Bunların dışında örneğin zararlı yazılım geliştiricileri de bu bildirimleri kendi çıkarları doğrultusunda kullanmaktalar. Mesela çok basit bir örnek verelim, diyelim ki siz bir zararlı yazılım geliştirdiniz ve "*hıyar*" isimli işlem sizin çalışmasını istemediğiniz bir işlem. Bu durumda siz bir adet işlem bildirim rutini kayıt ettiriyorsunuz, Windows her yeni işlem oluşturulduğunda sizin bildirim rutininizi çağırıyor ve siz bu rutin içerisinden başlatılan işlemi inceleyip kendi kararınıza göre sonlandırabiliyorsunuz. Bu arada, şunu da ekleyeyim bu bildirim rutinleri her Windows sürümünde yok. Ama Vista ve sonrası sürümlerde olduklarını söylesem yanlış söylemim olmam herhalde. Peki daha önceki sürümlerde ne yapıyorlardı? O zaman da zamanın izin verdiği taklalar atarak işletim sisteminin işleyişine müdahale edebiliyorduk. 

Yukarıda da değindiğimiz gibi bu bildirim rutinleri birkaç başlık altında toplanabilir. Şimdi mümkün olduğunca bu farklı başlıkları ele alalım bakalım neler varmış. Fakat şunu da ekleyeyim bu aşağıdaki başlıkların her birinden ayrı ve uzun bir yazı da çıkabilir. Çünkü bu rutinleri geliştirirken dikkat edilmesi gereken kısıtlamalar falan da var. Yine bazı dikkat edilmesi gereken keskin noktalar da mevcut, ileride gerekirse onlardan da bahseden bir yazı yazarım inşallah.

## İşlem Bildirim Rutinleri

İşlem bildirim rutinleri adından da anlaşılabileceği gibi herhangi bir işlem oluşturulduğundan meydana gelen bildirim rutinleridir. Şu anda bildiğim kadarıyla bu bildirim rutinlerinin üç farklı sürümü var. Bunlar kronolojik sırayla şu şekilde : *PsSetCreateProcessNotifyRoutine*, *PsSetCreateProcessNotifyRoutineEx* ve *PsSetCreateProcessNotifyRoutineEx2*.

### [PsSetCreateProcessNotifyRoutine](https://msdn.microsoft.com/en-us/library/windows/hardware/ff559951(v=vs.85).aspx)

Tarihsel sırayla gidelim. İlk fonksiyonumuz *Windows 2000*'den itiraben kullanılabiliyor ve bizden bir adet işlem oluşturulduğunda çağırılacak fonksiyon istiyor. Bu fonksiyonun `PASSIVE_LEVEL` seviyesinde ve kritik bir alan içerisinde(yani normal seviyesine sahip çekirdek APC çağrıları devre dışı iken) çağırılacağını akılda tutmakta yarar var. Aşağıda ilk fonksiyonun prototipini görüyorsunuz. Burada **NotifyRoutine** bildirim oluştuğunda çağırılacak olan fonksiyon. **Remove** ise sürücünüzü kaldırdığınızda bu bildirim rutinlerini de kaldırmanız gerektiği için bunu yaparken **TRUE** değerinin vermeniz gereken parametre. Bu arada lafı açılmışken ekleyelim, buradaki tüm bildirim rutinlerini çekirdek modundaki bir sürücüden ekliyorsunuz. Sürücünüz hafızadan kalkarken eklediğiniz tüm bildirim rutinlerini de silmek sizin göreviniz. Eğer bunu yapmazsanız kısa bir zaman içerisinde bilgisayarın mavi ekran hatası vereceği sanıyorum izahtan varestedir. 

```c
NTSTATUS PsSetCreateProcessNotifyRoutine(
  _In_ PCREATE_PROCESS_NOTIFY_ROUTINE NotifyRoutine,
  _In_ BOOLEAN                        Remove
);
```

Bizden yazmamız beklenen bildirim rutininin şekli ise aşağıdaki gibi:

```c
PCREATE_PROCESS_NOTIFY_ROUTINE SetCreateProcessNotifyRoutine;

void SetCreateProcessNotifyRoutine(
  _In_ HANDLE  ParentId,
  _In_ HANDLE  ProcessId,
  _In_ BOOLEAN Create
)
{ ... }
```

Burada **Create** isimli `BOOLEAN` tipine sahip parametre işlem oluşturulduğunda **TRUE** oluyor, işlem sonlandırılırken ise **FALSE** oluyor. Bu sonlandırılmadan kasıt ise yanlış hatırlamıyorsam işlem içerisindeki son işlemcik de sonlandırıldığında demekti. **ParentId** işlemi oluşturan işlemin belirteci, **ProcessId** ise şu anda oluşturulan işleme tahsis edilen işlem belirteci.

Hemen küçük basit bir örnek vereyim:

```c
//
//  Sürücünüz ilklenirken çalışan kodlar
//
//  Burada fonksiyon ya STATUS_SUCCESS geri dönecek, -ki bu 
//  fonksiyonun kayıt ettirildiğini gösterir- ya da bunun dışında
//  STATUS_INVALID_PARAMETER geri dönecek. Bu durumda ya kayıt etmeye
//  çalıştığınız rutin zaten kayıtlı, ya da sistem bildirim rutini limit
//  sayısına(64 olması lazım) ulaştı demektir.
//

NtStatus = PsSetCreateProcessNotifyRoutine(Bildirimci, FALSE);
if(!NT_SUCCESS(NtStatus))
{
	DEBUG("İşlem bildirimleri oluşturulamadı!");
	pDContext->ProcessNotifyEnabled = FALSE;
	goto RETURN;
}

//
// Sürücünüz kaldırılırken çalışan kodlar
//

if(pDContext->ProcessNotifyEnabled == TRUE)
{
	NtStatus = PsSetCreateProcessNotifyRoutine(Bildirimci, TRUE);
	...
	...
}

//
// Bildirim rutini
//
void Bildirimci(
    _In_ HANDLE  ParentId,
    _In_ HANDLE  ProcessId,
    _In_ BOOLEAN Create)
{
	if(Create == TRUE)
	{
		DEBUG("Yeni bir işlem oluşturuldu! PID : %x", ProcessId);
	}

}
```

### [PsSetCreateProcessNotifyRoutineEx](https://msdn.microsoft.com/en-us/library/windows/hardware/ff559953(v=vs.85).aspx)

Bir diğer türdeki işlem bildirim rutinleri için kullanacağımız fonksiyon ise `PsSetCreateProcessNotifyRoutineEx`. Bu fonksiyon da yine yukarıdakine benzer, yalnızca aşağıda bildirim rutininin şekline bakarsanız diğerinden farklı olduğunu görebilirsiniz. Fakaaat, burada şu ayrıntı önemli. Bu **Ex** son ekine sahip olan sürümü ekleyebilmeniz için sürücü dosyanızın `IMAGE_DLLCHARACTERISTICS_FORCE_INTEGRITY` değerine sahip olması gerekiyor. Ki, bu da sürücünüzün dijital imzaya sahip olması gerektiği anlamına geliyor. Eğer bu imza olmazsa kayıt işlemi sırasında fonksiyon kuvvetle muhtemel `STATUS_ACCESS_DENIED` değerini geri dönecektir. Ve yine şunu da ekleyelim bu bildirim rutini Windows Vista SP1 ve Windows Server 2008'den ve sonraki sistemlerde kullanılabilir. Son olarak, bu bildirim rutinleri de bir öncekinde söylediğimiz koşullar altında çağırılmaktadırlar. 

```c
NTSTATUS PsSetCreateProcessNotifyRoutineEx(
  _In_ PCREATE_PROCESS_NOTIFY_ROUTINE_EX NotifyRoutine,
  _In_ BOOLEAN                           Remove
);
```

Bu türdeki bildirim rutinlerinde kullanılan fonksiyonun tipine bakarsak neyin farklı olduğunu daha net bir şekilde görebiliriz.

```c
PCREATE_PROCESS_NOTIFY_ROUTINE_EX SetCreateProcessNotifyRoutineEx;

void SetCreateProcessNotifyRoutineEx(
  _In_        HANDLE                 ParentId,
  _In_        HANDLE                 ProcessId,
  _Inout_opt_ PPS_CREATE_NOTIFY_INFO CreateInfo
)
{ ... }
```

Buradaki ilk iki parametre diğeriyle aynı fakat son parametrenin **CreateInfo** gibi farklı ve bir yapıya gösterici olduğunu görüyoruz. Peki bu yapı nasıl? Şöyle:

```c
typedef struct _PS_CREATE_NOTIFY_INFO {
  SIZE_T              Size;              // Bu yapının boyutu
  union {
    ULONG  Flags;                        // Ayrılmış, kullanmayın deniyor
    struct {
      ULONG FileOpenNameAvailable  :1;   // Eğer bu alan TRUE ise ImageFileName alanı kesinlikle NULL değil demektir
      ULONG IsSubsystemProcess   :1;     // Eğer altsistem Win32 dışında bir şey ise TRUE olur
      ULONG Reserved  :30;
    };
  };
  HANDLE              ParentProcessId;  // Bu işlemi oluşturan işlemin belirteci
  CLIENT_ID           CreatingThreadId; // Bu işlemi oluşturan işlemin/işlemciğin belirteci
  struct _FILE_OBJECT  *FileObject;     // Çalıştırılan dosyanın nesnesine gösterici
  PCUNICODE_STRING    ImageFileName;    // Çalıştırılan dosyanın adı/yolu
  PCUNICODE_STRING    CommandLine;      // İşlemin komut satırı
  NTSTATUS            CreationStatus;   // Oluşturulma durumunun sonucu
} PS_CREATE_NOTIFY_INFO, *PPS_CREATE_NOTIFY_INFO;
```

Buradaki tüm alanları tek tek açıklamaya girmek istemiyorum lakin bu açıklama kısmına girersek mesela dosya bildirim rutinlerinin alanlarını açıklamak 5874 gün sürer. O nedenle bu kısmı bir alıştırma olarak okuyuculara bırakıyorum fakat yine de kısa özetleri yukarıda bıraktım. Zaten buradaki alanların isimleri ne oldukları konusunda da az çok fikir veriyor. Ama elimizdeki imkanı belirtmek adına sadece bir tane örnek vereyim. Yapı içerisindeki **CreationStatus** alanını `STATUS_ACCESS_DENIED` yaparsanız oluşturulan işlem çalışmadan sonlandırılacaktır. Bu tür bildirim rutinleri de tıpkı öncekinde yaptığımız şekilde kayıt ettiriliyor. Sadece kullanılan bildirim kayıt eden fonksiyon ve bildirim fonksiyonunun tipi değişiyor. Ve ayrıca tekrar üstünde durmakta fayda var, sürücünüzün imzalı olması gerekiyor.

### [PsSetCreateProcessNotifyRoutineEx2](https://msdn.microsoft.com/en-us/library/windows/hardware/mt805891(v=vs.85).aspx)

Evet, işlem bildirimleri için kullanılan son dostumuza geldik. Bu bildirim rutini tipi bildiğim kadarıyla en son eklenen(Windows 10(1703)) işlem bildirim rutini çeşidi. Ha, şunu da söyleyeyim, Windows'un hiç bize anlatmadığı yani ortalığa çıkmayan bildirim rutinleri de her zaman olabilir. Microsoft bu konuda oldukça ağzı sıkıdır. Yani tarzanca söylersek "*undocumented*" birçok şey hala çekirdeğin içerisinde duruyor haberiniz olsun :) Neyse, devam edelim. Bu tipte de sürücünüzün dijital imzaya sahip olması gerekiyor. Ve aksi durumda önceki bildirim rutini tipindeki hatayı alıyorsunuz. Bu bildirimi kayıt eden fonksiyonun tipi şu şekilde:

```c
NTSTATUS PsSetCreateProcessNotifyRoutineEx2(
  _In_ PSCREATEPROCESSNOTIFYTYPE  NotifyType,
  _In_ PVOID                     NotifyInformation,
  _In_ BOOLEAN                   Remove
);
```  

Burada gördüğünüz gibi diğerlerinden farklı olarak iki parametre var. Ve asıl ilginç olan ise **NotifyInformation** alanının `PVOID` tipine sahip olması. E diğer parametrenin de bir tip gösteren değer olduğunu düşünürsek bu fonksiyona ileride yeni tipler ekleyebilirler anlamına geliyor. Hatta şu an biraz incelesek belki de dışarı söylenmemiş olan tiplerin olduğunu görebiliriz. Bu tip alanı için kullanabildiğimiz değerler şimdilik şöyle:

```c
typedef enum _PSCREATEPROCESSNOTIFYTYPE { 
  PsCreateProcessNotifySubsystems  = 0 // İşlem bildirim rutini tüm altsistemler için çağırılacak demek
} PSCREATEPROCESSNOTIFYTYPE;
```

Eğer bu **NotifyType** alanına `PsCreateProcessNotifySubsystems` değerini verirseniz **NotifyInformation** alanı üstteki bildirim tipinde olduğu gibi `PCREATE_PROCESS_NOTIFY_ROUTINE_EX` yapısı ile çalışacak bir fonksiyon tipi bekliyor demektir. İleriki zamanlarda buraya daha farklı fonksiyonların ekleneceği de kuvvetle muhtemel o nedenle arada bir göz atmakta yarar olabilir.

## İşlemcik Bildirim Rutinleri

Bir diğer bildirim rutinimiz ise işlemcikler için. -Bu arada **işlemcik** diyorum da, eğer takip ediyorsanız bu kelimeyi **Thread** kelimesinin karşılığı olarak kullandığımı sanırım fark etmişsinizdir.- Bu bildirim rutinleri yine anlaşılabileceği gibi bir işlem kendi içerisinde bir işlemcik oluşturduğunda çağırılıyor. Yahut bir işlem başka bir işlem içerisinde bir işlemcik oluşturduğunda. Hmm. Bu durumda insanın kafasına birtakım katakulliler geliyor zira bir işlem neden başka bir işlemin içerisinde işlemcik oluşturur ki? 

Bu bildirimler için yine beni bildiğim kadarıyla iki farklı tip var. Bunları kayıt ettirmek için sırasıyla `PsSetCreateThreadNotifyRoutine` ve `PsSetCreateThreadNotifyRoutineEx` fonksiyonlarını kullanıyoruz. Bu iki tip `PASSIVE_LEVEL` veya `APC_LEVEL` seviyesinde çağırılabilir bu nedenle farklı IRQL seviyelerinde yapabilecekleriniz hakkında bilginiz olursa sürücünüzün sağlığı için iyi olur sahiden. Yine tarihsel bir sırayla gidip bu fonksiyonları ve bu fonksiyonlar ile kayıt ettirilen bildirim rutinlerini inceleyelim.

### [PsSetCreateThreadNotifyRoutine](https://msdn.microsoft.com/en-us/library/windows/hardware/ff559954(v=vs.85).aspx) 

Fonksiyonun tipi şu şekilde:

```c
NTSTATUS PsSetCreateThreadNotifyRoutine(
  _In_ PCREATE_THREAD_NOTIFY_ROUTINE NotifyRoutine
);
``` 

Burada ilk dikkat çeken şey işlem bildirim rutinlerinde olan **Remove** parametresinin olmaması. E bu işlemcik rutinlerini silmemize gerek olmadığı anlamına mı geliyor? Elbette hayır. Bunun için ise farklı bir fonksiyon olan `PsRemoveCreateThreadNotifyRoutine` fonksiyonu kullanıyoruz. Yukarıda işlemcik bildirim rutini için verilen `PCREATE_THREAD_NOTIFY_ROUTINE` tipine yakından bakalım:

```c
PCREATE_THREAD_NOTIFY_ROUTINE SetCreateThreadNotifyRoutine;

void SetCreateThreadNotifyRoutine(
  _In_ HANDLE  ProcessId,
  _In_ HANDLE  ThreadId,
  _In_ BOOLEAN Create
)
{ ... }
```

İlk işlem bildirim rutininin hemen hemen aynısı gördüğünüz gibi. Yalnızca burada **ParentId** gibi bir şey yok doğal olarak. Onun yerinde oluşturulan işlemciğin belirteci ve bu işlemciği oluşturan işlemin belirteci var. **Create** parametresi ise yine işlem bildirim rutininde olduğunu gibi eğer işlemcik oluşturuluyorsa **TRUE**, sonlandırılıyorsa **FALSE** oluyor. Bu arada, burada şunu diyebilirsiniz "*yav üç tane malayani parametre bizim ne işimize yarayacak?!*" ama öyle değil. Burada yalnızca **ThreadId** bile kullanmayı bilen için dağları aşmak demektir... Bunun için de sistem seviyesindeki bilginizin artması gerekiyor tabi. Bu da zamanla, çalışmayla ve sabırla ve bir de opsiyonel olarak iyi niyetle olacak bir şey. Zaten sistem seviyesinde bilginiz olmadan bu tür rutinlerin varlığı sizi Sartre benzeri bir anlamsızlığa sürükleyebilir hehe.

### [PsSetCreateThreadNotifyRoutineEx](https://msdn.microsoft.com/en-us/library/windows/hardware/dn957857(v=vs.85).aspx)

Diğer tipimizi kayıt ettiren fonksiyon ise bu arkadaş. Sonunda bulunan **Ex**'in genişletilmiş anlamına gelen "*extended*"dan geldiğini hatırlıyorum sanki. Ordan gelmiş olmasa bile yine de bu fonksiyonların sonundaki **Ex**'i gayet güzel açıklıyor bence. Bu tip için dikkat etmeniz gereken şey bu türdeki bildirim rutinlerinin *Windows 10*'dan ve sonrasında kullanılabiliyor olması. Açıkçası ben bunu daha öncesinde de var diye biliyordum ama şu an deneyebileceğim bir sanal makine olmadığı için test edemedim. 

Fonksiyonun tipi aşağıdaki gibi:

```c
NTSTATUS PsSetCreateThreadNotifyRoutineEx(
  _In_ PSCREATETHREADNOTIFYTYPE NotifyType,
  _In_ PVOID                    NotifyInformation
);
``` 

Bu tipi de silmek için yine `PsRemoveCreateThreadNotifyRoutine` fonksiyonunu kullanıyoruz. Bu fonksiyonda da görüldüğü üzere farklı tipler belirleyebiliyoruz **NotifyType** parametresi ile. Bunlar şu şekilde:

```c
typedef enum _PSCREATETHREADNOTIFYTYPE { 
  PsCreateThreadNotifyNonSystem   = 0,  // Aşağıda açıkladım 
  PsCreateThreadNotifySubsystems  = 1   // Tüm altsistemler için çağırılıyor
} PSCREATETHREADNOTIFYTYPE;
```

Burada eğer **NotifyType** parametresi `PsCreateThreadNotifySubsystems` ise, bu fonksiyon `PsSetCreateThreadNotifyRoutine` ile aynı çalışıyor. Fakat eğer bu **NotifyType** parametresi `PsCreateThreadNotifyNonSystem` olursa o zaman olay biraz daha farklılaşıyor. Teknik anlamda değişen şey şu, bizim bildirim rutinimizin çalıştırıldığı yer ve zaman değişiyor. İlk durumda bildirim rutinimiz işlemciği oluşturan işlemciğin içerisinde çağırılıyor. İkinci durumda ise bildirim rutinimiz oluşturulan işlemciğin içerisinde çağırılıyor. Bu fark bildirim rutininizde yapmak istediğiniz işlemlere göre size ek kolaylık sağlayabilir.

## Çalıştırılabilir Dosya Yükleme Bildirim Rutinleri

Bu rutinler sistemki bir çalıştırılabilir dosya hafızaya yüklendiği veya disk ile eşlendiği("*mapping*") zaman çalıştırılıyor. Örneğin .exe, .dll, .sys uzantılı dosyaları bunlar arasında gösterebiliriz. Bunun için de yine iki farklı fonksiyon kullanabiliyoruz bunlar `PsSetLoadImageNotifyRoutine` ve `PsSetLoadImageNotifyRoutineEx`.

### [PsSetLoadImageNotifyRoutine](https://msdn.microsoft.com/en-us/library/windows/hardware/ff559957(v=vs.85).aspx)

*Windows 2000* ve sonrasında kullanılabilen bu fonksiyonun tipi aşağıdaki gibi:

```c
NTSTATUS PsSetLoadImageNotifyRoutine(
  _In_ PLOAD_IMAGE_NOTIFY_ROUTINE NotifyRoutine
);
```

Bu fonksiyonla ilgili önemli bir ayrıntı şu, Windows 8.1 öncesi sistemde aynı anda kayıt edilebilecek en fazla bildirim rutini sekiz. Bu nedenle bu fonksiyonu çağırdığınızda `STATUS_INSUFFICIENT_RESOURCES` geri dönebilir. Hele ki sisteminizde birden fazla güvenlik yazılımı varsa bu hatayı alma olasılığınız oldukça artıyor diyebiliriz. Fakat Microsoft, Windows 8.1 ile gelen bir güncelleme ile bu limiti 64'e çıkardı bilginiz olsun. Bir de, bu güncelleme aynı zamanda Windows 7'ye de yüklenebiliyor diye biliyorum.

Yine bu fonksiyon ile eklediğiniz çalıştırılabilir dosya bildirim rutinlerini silmek için `PsRemoveLoadImageNotifyRoutine` fonksiyonu kullanabilirsiniz. Bu fonksiyona diğerlerinde olduğu gibi kayıt ettirdiğiniz bildirim rutini fonksiyonunu parametre olarak veriyorsunuz.
Bildirim rutinimizin `PLOAD_IMAGE_NOTIFY_ROUTINE` sahip tipini genişletirsek şöyle bir şey görüyoruz:

```c
PLOAD_IMAGE_NOTIFY_ROUTINE SetLoadImageNotifyRoutine;

void SetLoadImageNotifyRoutine(
  _In_opt_ PUNICODE_STRING FullImageName,
  _In_     HANDLE          ProcessId,
  _In_     PIMAGE_INFO     ImageInfo
)
{ ... }
```

Burada yine çok işe yarayan üç adet parametre görüyoruz. Bunlardan ilk ikisi isimlerinden de anlaşılabileceği gibi dosyanın ismini ve bu dosyayı işleyen işlemin belirteci. Burada dikkat etmeniz gereken en önemli şeylerden biri **FullImageName** alanının **NULL** değer olabileceği. O nedenle sanki bu alan hiç **NULL** olmayacakmış gibi hareket etmemek gerekiyor. Hatta unutmayın ki çekirdek modundasınız, kullanacağınız tüm göstericilere dikkat etmeniz gerekiyor elbette.

Son parametre olan **ImageInfo** veri yapısı ise şu şekilde tanımlanmış.

```c
typedef struct _IMAGE_INFO {
  union {
    ULONG Properties;
    struct {
    };
    ULONG ImageAddressingMode  :8;  // Her zaman IMAGE_ADDRESSING_MODE_32BIT
    ULONG SystemModeImage  :1;      // Eğer yüklenen bir sürücü ise TRUE
    ULONG ImageMappedToAllPids  :1; // Her zaman 0
    ULONG ExtendedInfoPresent  :1;  // Aşağıda açıkladım
    ULONG MachineTypeMismatch  :1;  // Her zaman 0
    ULONG ImageSignatureLevel  :4;  // SE_SIGNING_LEVEL_* değerlerinden biri
    ULONG ImageSignatureType  :3;   // SE_IMAGE_SIGNATURE_TYPE tiplerinden biri
    ULONG ImagePartialMap  :1;
    ULONG Reserved  :12;            // Eğer dosyanın tamamı disk ile eşlenmiyorsa 0'dan farklı bir değer 
  };
  ULONG  ImageBase;                 // Dosyanın hafızadaki başlangıç adresi
  ULONG  ImageSelector;             // Her zaman 0
  SIZE_T ImageSize;                 // Dosyanın hafızadaki boyutu
  ULONG  ImageSectionNumber;        // Her zaman 0
} IMAGE_INFO, *PIMAGE_INFO;
```

Yapıdaki alanlarla ilgili kısa özetleri yukarıda belirttim fakar özellikle şuna değinelim, eğer **ExtendedInfoPresent** alanı **TRUE** ise bu veri yapısı aslında `IMAGE_INFO_EX` isimli biraz daha büyük bir veri yapısının bir parçası demektir. O veri yapısı da şu şekilde:

```c
typedef struct _IMAGE_INFO_EX {
  SIZE_T              Size;         // Bu yapının boyutu
  IMAGE_INFO          ImageInfo;    // IMAGE_INFO
  struct _FILE_OBJECT  *FileObject; // Dosyanın nesnesine gösterici
} IMAGE_INFO_EX, *PIMAGE_INFO_EX;
```

Bu durum olduğunda bu veri yapısına ulaşmak için `CONTAINING_RECORD` makrosunu kullanabilirsiniz.

### [PsSetLoadImageNotifyRoutineEx](https://msdn.microsoft.com/en-us/library/windows/hardware/mt826267(v=vs.85).aspx)

Bu fonksiyon da bir öncekinin birazcık genişletilmişi. Windows 10 ve sonrasında kullanılabiliyor. Aşağıdaki tipe sahip:

```c
NTSTATUS  PsSetLoadImageNotifyRoutineEx(
  _In_ PLOAD_IMAGE_NOTIFY_ROUTINE NotifyRoutine,
  _In_ ULONG_PTR                  Flags
);
```

Bu fonksiyonumuzun ilk parametresi yine öncekindeki gibi bir bildirim rutini. Değişen şey ise ikinci bir parametrenin gelmiş olması yani **Flags**. Bu alan için şu anda MSDN üzerinde anlatılmış sadece bir değer var, o da `PS_IMAGE_NOTIFY_CONFLICTING_ARCHITECTURE`. Bu bildirim rutinlerinin mimarisi ne olursa olsun tüm dosyalar için çağırılacağını belirtiyor.

Özellikle bu iki tip için şunu söyleyelim, bu rutinler içerisindeyken kullanıcı modundan hafıza tahsis etmek, serbest bırakmak, diski hafızaya eşlemek gibi işlemler çok tehlikeli. Lakin bu işlemler sırasında kullanılan bir hızlı mutex nesnesi sorun çıkartıyor. Bu konudan ağzı yanan da epey insan vardır (bknz: anti-malware için sürücü yazan yazar).

### İşlem, İşlemcik ve Çalıştırılabilir Dosya Bildirim Rutinleri İçin Öneriler

Bu bildirim rutinleri her ne kadar kullanması çok basit olsa da dikkat edilmesi gereken bazı hususlar var. Bunları aşağıdaki listede görebilirsiniz. Bu listede yer alanlar tarafımdan da tecrübeyle sabitlendiği için dikkate almanızda kesinlikle yarar var....

* Bildirim rutinleriniz sade olsun
* Herhangi bir doğrulama yapmak için direkt olarak kullanıcı moduna mesaj göndermeyin! 
* Kayıt defteri işlemleri yapmayın
* Çalışan kodu duraklatan işlemlerden kaçının! Bir olay nesnesini beklemek gibi mesela!
* Hele ki başka bir işlem/işlemcik ile eşzamanlama yapmaya sakın kalkışmayın.
* Çalıştırılabilir Dosya bildirimlerinde kullanıcı modunda hafıza tahsis eden, eşleyen, serbest bırakan işlemleri yapmayın!

Eğer yukarıdaki listedeki bazı şeyleri illa yapmanız gerekiyorsa bunun için "*System Worker Threads*" kullanmayı tercih edebilirsiniz.

### Bonus! Bildirim Rutini Ekleyen Bir Fonksiyonun İncelenmesi

Az önce anlık bir sevinç patlaması yaşadım o nedenle şimdi bu bildirim rutinlerini ekleyen fonksiyonlardan birinin incelemesini de yapmaya karar verdim. Bu sayade bunların sistem seviyeinde nasıl eklendiğini ve nasıl çağırıldığını görme imkanına da sahip olacağız...

Bu inceleme için ben çalıştırılabilir dosya bildirim rutinlerini seçtim. O halde öncelikle incelememize `PsSetLoadImageNotifyRoutine` fonksiyonu ile başlayalım. Bakalım nerelere gideceğiz... Aşağıdaki her şey benim son sürüm en güncel Windows 10 bilgisayarımdan alınmadır.

```assembly
public PsSetLoadImageNotifyRoutine
PsSetLoadImageNotifyRoutine proc near
sub     rsp, 28h
xor     edx, edx        ; Flags
call    PsSetLoadImageNotifyRoutineEx
add     rsp, 28h
retn
PsSetLoadImageNotifyRoutine endp
```

Görüldüğü gibi bu yeni sistemleride **Ex**'li olmayan fonksiyon, **Ex**'li olana bir zıplama alanı olarak kullanılıyor. Burada dikkate değer tek şey **Flags** alanının bir `xor` işlemi ile sıfırlandığı. O halde yola **Ex** son ekli fonksiyon ile devam edelim.

```assembly
mov     rsi, rcx
test    rdx, 0FFFFFFFFFFFFFFFEh ; Flaglerde beklemediğimiz bir şey var mı?
jnz     WRONG_FLAG ; Evet var!
call    ExAllocateCallBack ; Yok, o zaman bir tane çağrım nesnesi ver bize
mov     rdi, rax
test    rax, rax ; Verebildi mi?
jz      INSUF_RESOURCES ; Veremediyse dallan :(
xor     ebx, ebx
````

Burada öncelikle **Flags** parametresinin geçerliliği kontrol ediliyor. Eğer bu kontrolden geçebilirsek bir adet çağrım nesnesi tahsis edilip bize veriliyor. Bu nesneyi tahsis eden dostumuz oldukça kısa:

```assembly
mov     edx, 18h        ; NumberOfBytes, 24, bizim durumumuzda 3*8 yani 3 elemanı var
mov     ecx, 200h       ; PoolType  // Çalıştırılamaz havuz
mov     r8d, 'brbC'     ; Tag
call    ExAllocatePoolWithTag
mov     rbx, rax
test    rax, rax
jz      short loc_140597FBE ; Hafıza kalmadı mı yahu?!
mov     rcx, rax        ; SpinLock
mov     [rax+_EX_CALLBACK_ROUTINE_BLOCK.Callback], rsi ; rcx'den geldi yukarda, bizim fonksiyon
mov     [rax+_EX_CALLBACK_ROUTINE_BLOCK.Context], rdi  ; rdx'den geldi yukarda, context = 0
call    ExInitializePushLock  ; rcx'e alınan kilit nesnesini ilkliyor
```

Buradaki disassembly çıktısından fonksiyonu tekrar oluşturursak şöyle bir şey olduğunu söyleyebiliriz:

```c
PEX_CALLBACK_ROUTINE_BLOCK ExAllocateCallBack(PVOID Function, PVOID Context)
{
  EX_CALLBACK_ROUTINE_BLOCK *Callback;

  Callback = ExAllocatePoolWithTag(NonPagedPoolNx, sizeof(EX_CALLBACK_ROUTINE_BLOCK), 'brbC');
  if ( Callback )
  {
    Callback->Callback = Function;
    Callback->Context  = Context;
    ExInitializePushLock(&Callback->Lock);
  }

  return Callback;
}
```

Devam edersek bu nesnenin ilklenmesinden sonra sıra bildirim rutinimizin sistem yapılarına eklenmesine, yani bizim için kritik olan kısma geliyor.

```assembly
lea     rcx, PspLoadImageNotifyRoutine  ; Rutinleri tutan yapı bu!
xor     r8d, r8d
lea     rcx, [rcx+rbx*8] ; rcx = PspLoadImageNotifyRoutine[rbx*8]
mov     rdx, rdi ;rdi = rdx = Callback nesnemiz
call    ExCompareExchangeCallBack ; Eklemeyi dene bakalım
test    al, al ; Boş muydu? Ekleyebildik mi?
jz      NEXT_SLOT ; Hayır :( Sonraki slota geçelim
lock inc cs:PspLoadImageNotifyRoutineCount ; Evet! Ekledik, o zaman toplam eklenen sayısını arttır
mov     eax, cs:PspNotifyEnableMask
test    al, 1 ; En az bir bildirim rutini var mıymış önceden?
jnz     short loc_140597CF9 ; Varmış sorun yok.
lock bts cs:PspNotifyEnableMask, 0 ; Yokmuş! Ama artık var!
```

Evet, bütün kritik işlemin yapıldığı kısım işte bu kadar basit aslında. Burada ne öğrendik? `PspLoadImageNotifyRoutine` isimli ve her bir girdisi 8 bayt olan bir dizi var. Bu dizi çalıştırılabilir dosya bildirimleri için kayıt edilen rutinleri tutuyor. Burada sırayla tüm dizi sırası geziliyor ve bu rutinin daha önce eklenip eklenmediği kontrol ediliyor, eğer eklenmediyse ve rutin limitini aşmadıysak diziye ekleniyor.

En sonda ise `PspNotifyEnableMask` isimli bir değişken ile birtakım şeyler yapılıyor. Bu değişkeni incelediğimizde görüyoruz ki minik bir performans iyileştirmesi için eklenmiş. Ne yapıyor derseniz, şöyle ki sisteme bir işlem, işlemcik ya da çalıştırılabilir dosya rutini eklenirse bu değişkenin duruma göre farklı biti 1 yapılıyor. Daha sonra bu rutinlerin çağırıldığı yerlerde önce bu bit kontrol ediliyor eğer 1 ise demek ki sistemde çağrı var deyip çağırma işlemini yapıyor, eğer 0 ise yok eklenmemiş deyip birkaç satır kod çalıştırmaktan kurtulmuş oluyor sistem. Mesela bizim örneğimizde çalıştırılabilir dosya rutinleri için 0. bit kullanılıyor. Normal işlem rutinleri için 1. bit, Ex olanlar için 2. bit, normal işlemcikler için 3. bit, Ex olanlar için 4. bit kullanılıyor bilginiz olsun...

Bu kod parçacığında bir diğer dikkate değer fonksiyon ise `ExCompareExchangeCallBack`. Bu fonksiyonun yaptığı şey ona verilen dizi sırasındaki değeri belirtilmiş fonksiyon ile karşılaştırmak. Eğer aynısını bulursa 0'dan farklı bir değer dönerek bunu belirtiyor.

Diğer bildirim rutinlerinin eklenmesi, çağırılması ve silinmesi de üç aşağı beş yukarı buradaki gibi yapılıyor. Fakat okuyuculara tavsiyem diğerlerini de kendilerinin incelemesi. Bu sayede hem pratik yapmış da olursunuz.

Son olarak bu fonksiyonu da yukarıdaki disassembly çıktısına dayanarak tekrar inşa etmeye çalışalım. Tam olarak aynısı olmasa da bu fonksiyonun aşağı yukarı şöyle bir temelde olduğunu rahatlıkla söyleyebiliriz:

```c
NTSTATUS PsSetLoadImageNotifyRoutineEx(PVOID NotifyRoutine, ULONG_PTR Flags)
{
  ULONG Count;
  PEX_CALLBACK_ROUTINE_BLOCK Callback; 
  NTSTATUS NtStatus = STATUS_INVALID_PARAMETER_2; 

  if ( Flags & 0xFFFFFFFFFFFFFFFE )
  {
      goto RETURN;
  }
  
  Callback = ExAllocateCallBack(NotifyRoutine, Flags);
  if ( Callback == NULL )
  {
      NtStatus = STATUS_INSUFFICIENT_RESOURCES;
      goto RETURN;
  }
  
  Count = 0;
  while ( !ExCompareExchangeCallBack(&PspLoadImageNotifyRoutine[Count], Callback, 0) )
  {
      Count++;
      if ( Count >= 64 )
      {
          ExFreePoolWithTag(Callback, 0);
          NtStatus = STATUS_INSUFFICIENT_RESOURCES;
          goto RETURN;;
      }
  }
  
  InterlockedIncrement(&PspLoadImageNotifyRoutineCount);
  if ( !(PspNotifyEnableMask & 1) )
      InterlockedBitTestAndSet(&PspNotifyEnableMask, 0);
  
  NtStatus = STATUS_SUCCESS;

RETURN:
  return NtStatus;
}
```

Peki bu bildirim rutinleri nereden çağırılıyor? Hemen bakalım! Bunun için yapmamız gereken tek şey `PspLoadImageNotifyRoutine` dizisine olan referanslara bakmak. Ben bunu yaptığımda `PsCallImageNotifyRoutines` isimli bir fonksiyona ulaştım. Bu fonksiyonun yaptığı şey yukarıda bahsi geçen diziyi gezerek buradaki rutinleri tek tek çağırmak. Bu bildirimleri çağıran fonksiyon ise `MiDriverLoadSucceeded` ve `MiMapViewOfImageSection` fonksiyonları içerisinden çağırılıyor, ki bu da oldukça manidar sanıyorum....  

Bu arada bu referanslara bakarken `PspEnumerateCallback` isimli bir fonksiyon dikkatimi çekti. Windows 7'de böyle bir fonksiyonun olmadığına eminim az önce baktım. Bu fonksiyon ilginçmiş. Lakin bunu çağıran fonksiyon bir isme sahip değil. Daha da ilginci devasa büyük bir fonksiyon tarafından çağırılıyor. Aklıma direkt olarak *PatchGuard* geldi açıkçası. Neden derseniz, *PatchGuard*'ın fonksiyonları işletim sistemi çekirdeğindeki en büyük fonksiyonlar. Boyutları gerçekten aşırı büyük, bu sayede hemen bulunabiliyorlar ama incelemesi de inanılmaz zor... Biraz eğlenmek isteyen dostlarımız bir göz atabilir :) Bu fonksiyon da karşıma çıkınca dayanamadım. Evet, isminden anlaşıldığı gibi bu fonksiyon ile sistemdeki bildirim rutinlerine ulaşabiliyorsunuz. Geçen sene yazdığım anti-rootkit'de ben taklalar atarak ulaşıyordum bunu öğrendiğim güzel oldu... Olur da o projeye devam edersem şüphesiz kullanacağım.

Bu arada dayanamayıp fonksiyonu inceledim ve tekrar oluşturdum, o da şöyle bir şey oluyor:

```c
BOOL PspEnumerateCallback(DWORD Type, DWORD *Index, PVOID *Callback)
{
  PVOID CallbackArray; 

  switch(Type)
  {
  	case 0:
  	    CallbackArray = &PspCreateThreadNotifyRoutine;
  	    break;
  	case 1:
  	    CallbackArray = &PspCreateProcessNotifyRoutine;
  	    break;
  	case 2:
  	    CallbackArray = &PspLoadImageNotifyRoutine;
  	    break;
  }

  if ( *Index < 64 )
  {
    *Callback = &CallbackArray[*Index];
    *Index++;
    return TRUE;
  }

  return FALSE;
}
```

Bu durumda `Type` parametresine **0** verirseniz `PspCreateThreadNotifyRoutine`; **1** verirseniz `PspCreateProcessNotifyRoutine`, **2** verirseniz `PspLoadImageNotifyRoutine` ile eklenen bildirimleri gezebilen bir kod parçasına sahip olabiliyorsunuz. E tabi bunu yapmak bu fonksiyon olmadan çok mu zor? Yoo. Gayet kolay. Sadece dışarıdan gizlenen bazı değişkenlerinin adreslerini bulmanız gerekiyor. Ama yine de bu yeni yöntem bence çok daha uygun.

## Sistem Kapanma Bildirim Rutini

Bu bildirimleri sürücülerde sistemin kapanacağı sırada yapmamız gereken işlemler var ise kayıt ettiriyoruz. Bunun için `IoRegisterShutdownNotification` isimli bir fonksiyonu kullanıyoruz.

```c
NTSTATUS IoRegisterShutdownNotification(
  _In_ PDEVICE_OBJECT DeviceObject
);
```

Gördüğünüz gibi bu fonksiyona parametre olarak sürücümüzün aygıt nesnesini veriyoruz. Bunu yaptığımız zaman bu fonksiyon bizim aygıt nesnesini `IopNotifyShutdownQueueHead` isimli bir listeye ekliyor. Bu listeye eklenen tüm aygıt nesneleri `IoShutdownSystem` fonksiyonu çağırıldığı zaman `IRP_MJ_SHUTDOWN` Irp'si alıyor. Bu sayede sistemin kapanmakta olduğu bilgisini almış oluyorlar. Tabi bu olayın çalışması için sürücünüzde bu Irp'yi işleyecek fonksiyonu eklemeniz gerektiğini söylemeye gerek yok sanırım...

Bu bildirimler dışında aslında kayıt defteri için, dosyalar, ve bir çok nesne için de benzer mekanizmalar mevcut. Fakat başlangıç için bunların yeterli olduğunu düşünüyorum. Aslında buradaki tüm rutinlerinin sistem seviyesinde analizini yapmayı düşünüyordum fakat ilk başta sahip olduğum motivasyon şu anda baya azaldı. O nedenle biraz kısa tutuyorum yazıyı. Aklınıza takılan sormak istediğiniz herhangi bir şeyde elbette yorumları kullanabilirsiniz. Ayrıca dediğim gibi, kafam motivasyon odaklı çalıştığı için durduk yere yazı yazmak biraz zor oluyor -ki, aslında durduk yere de sahip olduğum bağzı motivasyonlar var, ama bu başka bir konu hehe-. Bu nedenle anlatılmasını istediğiniz konuları belirtebilirsiniz. Eğer bilgim varsa onunla ilgili yazı yazmaya çabalarım....

Sevgiler 
