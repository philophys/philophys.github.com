---
title: Sürücülerde IOCTL Kullanımı
categories: Bilgisayar
---

Selamlar.

Birkaç aylık süren sessizlik temayülünden sonra tekrar kabuğumdan çıkmaya karar verdim. Bu süre içinde yazacak nice konu biriktirdim fakat okuyucuya bi yılgı vermemek açısından bu yazının konusunu *sürücü geliştirirken IOCTL kullanımı*, yani diğerlerine nispeten ısınma turu sayılabilecek olan bir konuya ayırıyorum. 

Ta 2013'de miydi neydi(şimdi bakmaya çok üşendim) linux için sürücü geliştirmeyle ilgili kısıtlı içeriğe sahip bir yazı yazmıştım fakat olacak iş ya, bu defa windows tarafındayım(Asla vazgeçmem diyordum, yani linuxtan ehehe).

Şimdi bu yazıda ne öğreneceğiz(ya da öğrenmeyi umuyoruz) dersek, kısaca sürücü geliştirmeye de değinecez fakat ağırlık olarak kullanıcı ve çekirdek tarafındaki veri alışverişini bu sürücüler aracılığıyla nasıl yapabileceğimizden bahsedeceğiz. Kancalama Sanatı yazılarında temel olarak sürücülerin nasıl bi yapıda olduğunu zaten görmüştünüz, fakat bu defa olayı biraz daha derine çekeceğiz (-ceğiz,-cağız'lı konuştukça kendimi siyasete girecek gibi hissediyorum).

Öncelikle iskelet bir sürücünün nasıl olduğundan kısaca bahsedelim. Ardından işin IOCTL yönetimi kısmına geçiş yapıp, daha sonrasında ise kullanıcı modundan çekirdek moduna iletişimi nasıl sağlayacağımızı da görelim.

## Her şeyin başladığı yer : DriverEntry<sup>[1](https://msdn.microsoft.com/en-us/library/windows/hardware/ff544113(v=vs.85).aspx)</sup>
`DriverEntry` fonksiyonu, sürücü yüklendikten sonra çağırılan ilk fonksiyondur ve yapması gereken şey sürücünün çalışabilmesi için gereken işlemleri gerçekleştirmektir. Nasıl ki öyle bir şeyler test etmek için bir program yazdığınızda genelde önce `main` fonksiyonunuz çağırılıyor(ki, haddizatında önce main değil derleyicinin başlatıcı rutini çalıştırılır) sürücülerde de bu fonksiyon çağırılıyor. Tabi illa ismi `DriverEntry` olmak zorunda değil, kendiniz belirleyebilirsiniz fakat bazı yerlerde rajona uymak kodu sonradan okuyacak olanlar ve önceden tanımlı diğer fonksiyonlar için de daha hoş olabilir, değil mi? Ben rajon anlamam derseniz de, eğer kendiniz başka bir isim ile tanımlama yaparsanız bunu bağlayıcıya bildirmeyi unutmayın.

MSDN'e bakacak olursak fonksiyon ile ilgili bize şöyle bir prototip sunulmuş:

	DRIVER_INITIALIZE DriverEntry;

	NTSTATUS DriverEntry(
	  _In_ struct _DRIVER_OBJECT *DriverObject,
	  _In_ PUNICODE_STRING       RegistryPath
	)
	{ ... }

Prototipten görüldüğü üzere bu fonksiyona 2 adet parametre geliyor. *DriverObject* ve *RegistryPath*. İlki sürücümüzün `DRIVER_OBJECT` yapısına bir gösterici, diğeri ise sürücümüzün kayıt defteri girdisini gösteriyor.. En üst satırda gördüğünüz `DRIVER_INITIALIZE` tipi ise fonksiyonumuzun bildirimi için kullanılıyor. *RegistryPath* değerimiz bize `\Registry\Machine\System\CurrentControlSet\Services\` altında bizim sürücü ismimize ait bir yer veriyor. Bu alanda dilersek bize özel veri de saklayabiliriz, aklınızda bulunsun. Şunu da ekleyeyim, eğer bu *RegistryPath*'ı kullanacaksanız buradaki değerin kopyasını almalısınız çünkü G/Ç yöneticisi(tarzanca : I/O manager) `DriverEntry` fonksiyonunudan döndüğü sırada bu alanı serbest bırakır.

Bu fonksiyona gelen *DriverObject* yapısı aşağıdaki gibi ve G/Ç yöneticisi tarafından tahsis ediliyor. Bu yapı bir sürücü nesnesini tanımlamak için kullanılıyor. (Yazar notu: Tarzanca kavramları Türkçe'ye çevirmek, yapıyı anlaşılır kılmaya çalışarak anlatmaktan daha zor yaa. Aslında Türkçe çevirileri daha hoş oluyor da, alışılmamış olduğu için enteresan geliyor yahu.)

	typedef struct _DRIVER_OBJECT
	{
	     SHORT Type;
	     SHORT Size;
	     PDEVICE_OBJECT DeviceObject;
	     ULONG Flags;
	     PVOID DriverStart;
	     ULONG DriverSize;
	     PVOID DriverSection;
	     PDRIVER_EXTENSION DriverExtension;
	     UNICODE_STRING DriverName;
	     PUNICODE_STRING HardwareDatabase;
	     PFAST_IO_DISPATCH FastIoDispatch;
	     LONG * DriverInit;
	     PVOID DriverStartIo;
	     PVOID DriverUnload;
	     LONG * MajorFunction[28];
	} DRIVER_OBJECT, *PDRIVER_OBJECT;

Buradaki *DeviceObject* elemanı bizim sürücümüze bağlı çalışan aygıtları temsil ediyor. Herhangi bir sürücü birden fazla aygıtı kontrol ediyor olabilir bu nedenle bu aygıtların bir bağlı liste ile birbirine bağlı olduğunu da söyleyeyim.. Yapıda geri kalan elemanların bazılarını yeri geldiğinde anlatıcam fakat hepsine değinmeyecem (yer sıkıntım var çünkü).

*DriverEntry* çağırıldıktan sonra yapmamız gereken şeyler var tabi. Bunlar sizin ne yapmak istediğinize göre belirlenen şeyler olduğu gibi aynı zamanda çoğu sürücüde olması gereken şeyler. Biz kullanıcı ile çekirdek arasında veri transferi yapmak istediğimiz için elzem olarak bir sürücü oluşturmamız gerekiyor. Ardından bizim sürücümüze gelecek istekleri işlemesi için birtakım fonksiyonlar da tanımlayacağız. Örneğin yeni bir aygıt(device) oluşturma kısmını şu şekilde hallediyoruz.

Bu arada, hayalinizde canlanması için **Driver**(sürücü)'yü patron, **Device**(aygıt)'ı da patrona bağlı işçiler gibi düşünebilirsiniz. Patron birtakım kişileri işe alıyor ve onlara çeşitli görevler veriyor. Genelde patron kibirli olduğu için daha çok işçilerle uğraşıyoruz biz.

	PDEVICE_OBJECT BiDeviceObject;
	UNICODE_STRING unicodeDriverDeviceName;
    	PCWSTR BiDeviceName = L"\\Device\\beirp";

	NTSTATUS DriverEntry(
		IN PDRIVER_OBJECT pDriverObject,
		IN PUNICODE_STRING RegistryPath)
	{
		UNREFERENCED_PARAMETER(RegistryPath);
		
		NTSTATUS NtStatus = STATUS_UNSUCCESSFUL;
        //Sürücünün kaldırılması sırasında çalışacak fonksiyon tanımlanıyor
		pDriverObject->DriverUnload = BiUnload;

		DbgPrint("Sürücü yüklenmesi basladi! \n");

		//
		// Unicode aygıt ismi hazirlaniyor
		//
		RtlInitUnicodeString(&unicodeDriverDeviceName, BiDeviceName);

		NtStatus = IoCreateDevice(
			pDriverObject,
			0,
			&unicodeDriverDeviceName,
			FILE_DEVICE_BEK,
			FILE_DEVICE_SECURE_OPEN,
			TRUE,
			&BiDeviceObject
			);

		if (!NT_SUCCESS(NtStatus))
		{
			DbgPrint("IoCreate hata verdi! \n");
			return NtStatus;
		}

Basitten başlarsak, burada ilk başta sürücümüzün kaldırılması sırasında çalışacak olan fonksiyonu tanımlıyoruz(`BiUnload`) ardından kullanıcıya `DbgPrint` ile yüklemenin başladığını belirtiyoruz. Bu fonksiyondan ve sürücünün kaldırılması olayından Kancalama Sanatı yazısında bahsettiğim için ayrıntısına girmiyorum..

Sonrasında `IoCreateDevice` fonksiyonu için bir aygıt ismi hazırlıyoruz. **BiDeviceName** bizim için unicode bir aygıt ismi saklıyor. Baştaki **L** öntakısı ise dizinin unicode olarak saklanması gerektiğini belirtiyor. Ardından `RtlInitUnicodeString` fonksiyonu `UNICODE_STRING` yapısındaki bir veriyi oluşturuyor. Aygıt isimleri genelde `\\Device\\XXX` şeklinde tanımlanıyorlar. Baştaki `\\Device` öneki neden derseniz, bu windowsun nesne yönetimi ile ilgili bir şey. Düşünün ki bir kütüphane var, ve farklı farklı raflar var. Aygıt'ların koyulduğu raf da `\\Device` olarak tanımlanmış. Konu dışında olduğu için çok girmiyorum ama bu örnek az çok bi fikir vermiştir di mi?. Şimdilik aygıt oluştururken bu şekilde tanımlamanız gerektiğini bilmek yeterli. Bu arada merak edenler için `UNICODE_STRING` yapısı şöyle.

	typedef struct _UNICODE_STRING {
	  USHORT Length;
	  USHORT MaximumLength;
	  PWSTR  Buffer;
	}

`IoCreateDevice`<sup>[2](https://msdn.microsoft.com/EN-US/library/windows/hardware/ff548397(v=vs.85).aspx)</sup> aygıt ismini unicode olarak beklediği için bunu yapmamız gerekiyor. `IoCreateDevice` fonksiyonunun prototipi şöyle:

	NTSTATUS IoCreateDevice(
	  _In_     PDRIVER_OBJECT  DriverObject,
	  _In_     ULONG           DeviceExtensionSize,
	  _In_opt_ PUNICODE_STRING DeviceName,
	  _In_     DEVICE_TYPE     DeviceType,
	  _In_     ULONG           DeviceCharacteristics,
	  _In_     BOOLEAN         Exclusive,
	  _Out_    PDEVICE_OBJECT  *DeviceObject
	);

Adından da anlayabildiğiniz gibi bu fonksiyon bizim için bir aygıt nesnesi oluşturuyor. Parametrelerinden kısaca bahsetmek gerekirse ilk parametre olarak bizim sürücümüzün nesnesine(DRIVER_OBJECT yapısına) gösterici, ikinci olarak aygıt eklentisi(device extension) için ayrılacak alanı(bu alanı aygıtınız için kullanabiliyorsunuz, belki başka bir yazıda değiniriz..), üçüncü olarak aygıt ismini, dördüncü olarak aygıt tipini<sup>[3](https://msdn.microsoft.com/en-us/library/windows/hardware/ff563821(v=vs.85).aspx)</sup> (biz burada kendi tanımladığımız aygıt tipi olan FILE_DEVICE_BEK'i kullanacağız), beşinci olarak aygıtın karakteristik özelliklerini<sup>[4](https://msdn.microsoft.com/en-us/library/windows/hardware/ff563818(v=vs.85).aspx)</sup>, altıncı olarak ayrıcalıklı olup olmadığını (bu parametre aygıta aynı andan birden fazla tutamağın açılmasına izin verilip verilmeyeceğini belirtiyor) ve son olarak de oluşturulacak aygıtın `DEVICE_OBJECT` yapısını alacak bir gösterici veriyoruz.

Bu işlemin ardından sürücümüz `CreateFile` gibi tutamak üzerinden işlem yapan fonksiyonlar aracılığyla erişilebiliyor olacak. Fonksiyonun ilk parametresine sürücümüzün sembolik adını girersek(aşağıda değinecem) başarıyla bir tutamak(handle) elde etmiş olacağız. Ardından bu tutamağı kullanarak sürücümüze birtakım istekler gönderebilir vaziyetteyiz demektir...

Aygıt oluşturmayı hallettiğimize göre, şimdi sürücümüzün muhtelif isteklere cevap verebilmesini sağlamamız gerek. Bu muhtelif istekler **IRP Major Request** olarak isimlendiriliyor. Bunların bir de minör olanları var, onlar ise birazdan anlatacağım yığın yerlerinde tanımlanıyorlar.

	//
	// Once tum fonksiyonlari ontanimli isleyiciyle dolduralim
	// ardindan DEVICE_CONTROL icin isleyicimizi tanimlayalim
	//
	for (UINT16 i = 0; i < IRP_MJ_MAXIMUM_FUNCTION; i++)
	{
		pDriverObject->MajorFunction[i] = BiDefaultDispach;
	}
	pDriverObject->MajorFunction[IRP_MJ_DEVICE_CONTROL] = BiDeviceControl;
	
    DbgPrint("MJ yerlestirilmesi tamamlandi! \n");

Burada gördüğünüz üzere sürücü nesnemizin **MajorFunction** dizisine birtakım fonksiyonlar koyuyoruz. Bu dizideki her değer sürücünüze yapılacak farklı bir istek için çağırılır. Bunların listesini ve ayrıntılı açıklamalarını [şurada](https://msdn.microsoft.com/en-us/library/windows/hardware/ff550710(v=vs.85).aspx) bulabilirsiniz. Birazdan değineceğimiz **IRP**(Tarzanca : *I/O Request Packet*)'lerin işlenmesi işte bu dizideki fonksiyonlar aracılığıyla olmaktadır. Dizideki her eleman farklı bir isteği üstlenmekte fakat biz burada hepsini tanımlamak yerine öncelikle tümünü kendi yazdığımız bir fonksiyona atıyor, ardından özel olarak `IRP_MJ_DEVICE_CONTROL` için `BiDeviceControl` isimli fonksiyonu atıyoruz. Bunu neden yaptık çünkü yazının konusu olarak IOCTL seçtiğim içün, geri kalan major fonksiyonlar ilgi alanımız dışında. Onları da artık gerektiğinde inşallah anlatırım bi gün..

Son durum şu, `IRP_MJ_DEVICE_CONTROL` olarak gelen isteklerde(**DeviceIoControl** fonksiyonu ile) `BiDeviceKontrol`, geri kalanlarda ise `BiDefaultDispatch`'in çalşmasını sağlamış olduk.

Şöyle diyeyim, sürücünüze gönderilen her istekte -ki akabinde bu istek bir **IRP**'nin oluşmasına vesile oluyor- bu fonksiyonlardan biri çağırılıyor. Mesela hangi fonksiyonla yapılan çağrı neye denk geliyor derseniz şöyle örnekleyebiliriz:

* ReadFile        -> IRP_MJ_READ
* WriteFile       -> IRP_MJ_WRITE
* CreateFile      -> IRP_MJ_CREATE
* DeviceIoControl -> IRP_MJ_DEVICE_CONTROL
* CloseHandle     -> IRP_MJ_CLEANUP & IRP_MJ_CLOSE

Simetri takıntısı olanlar fark etti mi? eheheh. Neyse, fakat bu istekler sadece fonksiyonla gelecek diye bir şey yok. Meselam `IRP_MJ_SHUTDOWN` sistem kapatılırken sürücülere gönderilir ve sürücüler de ona göre sistem kapatılması sırasında yapması gereken şeyleri yaparlar gibi..

Son olarak ise sürücümüze ulaşmayı kolaylaştırmak için bir adet *sembolik bağlantı*  (symbolic link) oluşturuyoruz. Bu lazıme bir şey değil fakat yapmanız sürücünüz ile iletişimizi kolaylaştıracak. "Nasıl kolaylaştıracak yeaaa" diyen arkadaşlar için ürnek vereyim. Mesela bilgisayarınızca `C:` diye ulaştığınız sürücünüz aslında bir sembolik bağlantıdır. Benim bilgisayarımda `C:`, **HarddiskVolume4** aygıtına sembolik bağlantı olarak tanımlanmış durumda. Sanırım anlatabildim değil mi? İşte bu sembolik bağlantıları oluşturmak için de `IoCreateSymbolicLink` fonksiyonunu kullanıyoruz. Bu fonksiyon nesne yöneticisinin isim alanında(*GLOBAL??* dizininde) bizim için bir sembolik bağlantı oluşturacak.

	UNICODE_STRING unicodeDriverDeviceLink;
    PCWSTR BiDeviceNameLink = L"\\GLOBAL??\\beirp";

	RtlInitUnicodeString(&unicodeDriverDeviceLink, BiDeviceNameLink);
	
	NtStatus = IoCreateSymbolicLink(
		&unicodeDriverDeviceLink,
		&unicodeDriverDeviceName
		);

	if (!NT_SUCCESS(NtStatus))
	{
		DbgPrint("Sembolik baglanti olusturulurken hata! \n");
		return NtStatus;
	}

Misal, test etmek için göstereyim resimli göstereyim. Dikkat ederseniz aygıtımızın sembolik ismi `\\GLOBAL??` ön kelimesiyle kullanıyor. Bu da aynı zamanda `\\??` veya `\\DosDevices` olarak da bilinir<sup>[5](https://msdn.microsoft.com/en-us/library/windows/hardware/ff554302(v=vs.85).aspx)</sup>. Neticede nesne isim alanına bakabileceğiniz bir programla incelerseniz sembolik bağlantımızı görebilirsiniz.

![](/files/obbaglantimiz.png)

Yine gördüğünüz gibi bu fonksiyonlara hep *unicode* olarak tanımlanmış değerler veriyoruz. Unutmayın ki çekirdek tarafında da kullanıcı tarafında da birçok fonksiyon *unicode* ile işlem yapar. Hatta kullanıcı modu için de, misal bir örnek vereyim `CreateFileA` ve `CreateFileW` isimli fonksiyonların sonundaki **A** ve **W**, *Ansi* ve *Wide* anlamına gelir. Siz *Ansi* olan fonksiyonu çalıştırırsanız o fonksiyonun yapacağı şey aldığı *Ansi* değeri *Wide* bir değere çevirip `CreateFileW` isimli fonksiyonu çağırmak olacaktır. Haliyle bu hem kuantum düzeyinde zaman harcanması, hem de hafıza tüketilmesine sebebiyet verecek. O nedenle kullanıcı modunda da mümkün mertebe **Wide** sürümlerini kullanmaya özen göstermeniz yararınıza olacaktır.

Ah, bu arada merak edenler için `NT_SUCCESS` makrosu aldığı değerin başarılı olup olmadığını sorguluyor. Kendisi şu şekilde tanımlanmış, sürücü kodlarken oldukça kullanışlı diye düşünüyorum birçok kişi gibi...

    #define NT_SUCCESS(Status) (((NTSTATUS)(Status)) >= 0)

`DriverEnty` fonksiyonu geri dönüş değeri olarak başarı durumda `STATUS_SUCCESS` döndürmesi gerekiyor, başarısız olması durumunda ise ilgili hata kodunu. Böylece *DriverEntry* ile ilgili kısmın sonuna geldik. Şimdi kullandığımız major fonksiyonlara bakacağız fakat bundan önce **IRP** ve akabinde **stack location**(yığın yeri?) denilen yerler nedir ona kısaca bi değinelim çünkü bu major fonksiyonların direk ilişkili olduğu şeyler IRPler..

## IRP ve IRP Stack Location nedir?
Öncelikle **IRP**(I/O Request Packet - G/Ç İstek Paketi?) nedir biraz ondan bahsedelim. Basit olarak **IRP** sistem tarafından genellikle veri transferi amaçlı kullanılan bir veri yapısıdır. Bir sabit başlıktan ve bir veya birden fazla yığın yerinden(stack location) oluşur. G/Ç yöneticisi paket tabanlı çalıştığı için arka planda olan bir çok G/Ç işlemi IRP'ler aracılığıyla gerçekleştirilir. Mesela dosya oluştururken, okurken, arka tarafta bir ağ bağlantısı işleri dönerken elbet bir yerlerde IRP kullanılıyordur. Yapı için MSDN sayfasına<sup>[6](https://msdn.microsoft.com/en-us/library/windows/hardware/ff550694(v=vs.85).aspx)</sup> bakacak olursanız Microsoft(belki Micro$oft) yapıyı tarzancası "partially opaque" yani dilimizde söylersek kısmen şeffaf olmayan bir yapı olarak belirtmiş. Yani diyor ki "*bu yapının bazı yerlerini sana göstermek işime gelmiyor bu kadarıyla idare edecen*". Tabi internet üzerinde kısa bi aramayla yapının tamamına erişebilirsiniz. Kuvvetle muhtemel geliştiriciler, sürücüler arasında, işletim sistemi içerisinde veri transferi yaparken "*ya hacı, bi ton küçük küçük argümanı diğer fonksiyonlara geçireceğimize bunların hepsini birleştirek, adına da IRP diyek*" demişler. Böylece bir gösterici kullanarak tüm argümanları, verileri seyahat ettirebilme kolaylığını sunmuşlar.

Ayrıca IRP'ler sürücü yığınındaki sürücüden sürücüye(tarzancasıyla driver stack içerisinde) seyahat edebildikleri için geliştiriciler her sürücü için ayrı bir **IRP** oluşturmaktansa, IRP'nin sonuna **IRP Stack Location** ismi verilen başka bir yapı oluşturmayı uygun bulmuşlar. Bu yapı `IO_STACK_LOCATION` olarak tanımlanıyor. Sanırım bu olayı en güzel zincirleneme sürücüler üzerinden anlatabilirim. Zincirleme sürücü dediğim şey, birden fazla sürücünün birbirine bağlanmasıyla oluşur. Bu bağlanan sürücülerdeki en üst sürücü(top most) zincirdeki ilk IRP ulaşan sürücü iken, en düşük (lowest) sürücü ise zincirdeki son sürücü yani IRP'nin ulaşacağı en dip sürücüdür. Bu dip sürücü ise direkt olarak donanım ile konuşur. Zincirdeki her sürücü IRP üzerinde kendi üzerine düşen görevi yerine getirir. 

IRP'nin seyahat edeceği her sürücü için IRP'nin sonuna bir adet daha IRP yığın yeri eklenir. Bu direkt olarak G/Ç yöneticisi tarafından yapılır, çünkü bir IRP oluşturulurken G/Ç yöneticisi IRP'nin gezeceği zincirlenmiş kaç sürücü olduğunu bilir bu nedenle bu sayı kadar da IRP yığın yerini oluşturur. IRP'nin oluşturulup gezinmesi sırasında sürücüler ise üzerlerine düşen görevleri yapmak için  `IoGetCurrentIrpStackLocation` makrosu yardımıyla kendine ait yığın yerini elde edip işlemlerini gerçekleştirir. 

Analoji yapmak gerekirse, IRP'yi ana iş olarak düşünürsek, yığın yerleri de alt işler oluyor diyebiliriz. Sürücü yığınındaki her sürücü de bu işleri yapan kişiler oluyor. Bu kişilerin hepsinin birden tamamladığı iş bizim için IRP, her bir kişinin kendi işi için ise IRP yığın yeri kavramını kullanmak sanırım açıklayıcı olmuştur.

IRP konusunu açarsak oldukça genişletebiliriz fakat bu yazı için bu kadarı (şu satır sırasında) kafi diye düşünüyorum. Şimdi gelen istekleri işleyecek fonksiyonumuza geçebiliriz..

### BiDeviceControl
Hatırlarsanız bu fonksiyonu `DEVICE_OBJECT` içerisinde bulunan `MajorFunctions` dizisinin `IRP_MJ_DEVICE_CONTROL` sıralı elemanına yerleştirmiştik. Her ne zaman sürücümüze `DeviceIoControl` fonksiyonuyla bir istek gelse işte bu fonksiyon çalışacak. Taslak olarak şöyle gösterebilirim. Bu arada, `IRP_MJ_INTERNAL_DEVICE_CONTROL`'ün diğerinden farkı bu istek kullanıcı modundan değil, çekirdek modundan `IoBuildDeviceIoControlRequest` fonksiyonu yardımıyla geldiğinde oluşuyor.

    //
    //  IRP_MJ_DEVICE_CONTROL ve  IRP_MJ_INTERNAL_DEVICE_CONTROL bu fonksiyona geliyor
    //
    NTSTATUS BiDeviceControl(
        IN PDEVICE_OBJECT DeviceObject,
        IN PIRP Irp)
    {
        UNREFERENCED_PARAMETER(DeviceObject);

        ULONG              IOCTLcode;
        PIO_STACK_LOCATION IrpStackLocation;
        PVOID              pInputBuffer, pOutputBuffer;
        NTSTATUS           NtStatus = STATUS_UNSUCCESSFUL;

        //
        // Kernel'in cevap olarak kullanacagi veri burada
        //
        PCHAR pReturnData = "Al 5 kilo muz!";
        ULONG ReturnSize  = strlen(pReturnData)+1;

        //
        // Information'u ne kadar veri okuduk/yazdik belirtmek icin kullanabiliriz
        //
        Irp->IoStatus.Status      = STATUS_SUCCESS;
        Irp->IoStatus.Information = 0;

        //
        // Şu anki yığın yerini aliyoruz ve ardindan IOCTL kodumuzu buluyoruz
        //
        IrpStackLocation = IoGetCurrentIrpStackLocation(Irp);
        IOCTLcode        = IrpStackLocation->Parameters.DeviceIoControl.IoControlCode;

        DbgPrint("Kontrol kodu alindi! \n");

        //
        // Simdi hangi kodu aldigimizi belirleyip ona gore islem yapalim
        //
        switch (IOCTLcode)
        {
            case SU_IOCTL_GELDI:
                break;
            case AHA_BU_IOCTL_GELDI:
                break;
            case SIMDI_DE_BU_GELDI:
                break;
            default:
            {
                DbgPrint("Bilinmeyen kontrol kodu alindi! \n");
                NtStatus = STATUS_SUCCESS;
            }break;
        }

    	//
    	// IRP islendikten sonra IRP'yi tekrar G/Ç yöneticisine gonderiyoruz
    	// 2. parametre işlemcik(thread) için oncelik arttirabilir (gerekirse)
    	// Bu sayede IRP'miz tekrar geldiği yere dönebilmis olucak
    	//
        IoCompleteRequest(Irp, IO_NO_INCREMENT);

        // Bu NtStatus switch durumları içerisinde tekrar
        // belirlenecek, okumaya devam ehehe.
        return NtStatus;
    }

Şimdi... Öncelikle fonsiyonu biraz anlatalım. Ardından *switch* deyimi içerisini genişleteceğiz. Ben şu an kolaylık olsun diye switch içerisindeki case ifadelerini çıkarttım. *IOCTL* kavramını açıkladığımız zaman onlara da tek tek değineceğiz.

Öncelikle gördüğünüz gibi fonksiyonumuz iki parametre alıyor. Sürücülerdeki Major fonksiyonların yanlış bilmiyorsam hepsi bu prototipe sahiptir. İlk parametre olarak aygıtın nesnesine gösterici, ikinci olarak da **IRP** yapısına gösterici alıyorlar. Göstericilerin gözünü seveyim, bunların referansa göre değil de değere göre çağırılması durumunda oluşabilecek performans kaybını bi düşünsenize ehehe..

Ardından bazı değişkenler tanımladığımızı görüyorsunuz. Bunlardan biri çekirdeğin kullanıcıya göndereceği veri. Biz burada bu veriyi böyle çok basit muzlu bir şey tuttuk fakat hayal gücünüzü kullanın, burada yapıları falan de iletebileceğiniz için örneğin çekirdek tarafındaki bazı istediğiniz bilgileri alıp kullanıcı tarafına gönderebilirsiniz.

    PCHAR pReturnData = "Al 5 kilo muz!";
    ULONG ReturnSize  = strlen(pReturnData)+1;

Çekirdek bize veri olarak muzlu bir şeyler veriyor gördüğünüz üzre. *ReturnSize* isimli verimizin boyutunu belirten değişkenine sonlandırıcı karakter için 1 eklemeyi unutmuyoruz. Ha, tabi bu işin troll tarafı, dediğim gibi bu veri tamamen hayal gücünüze kalmış.

Ardından *Irp* yapısı içerisindeki bazı alanlara değer ataması yapıyoruz. Bu alanları ne kadar veri okuduk, ne kadar yazdık, sonuç ne oldu gibi sorulara cevap olarak kullanıyoruz haberiniz olsun..

    //
    // Information'u ne kadar veri okuduk/yazdik belirtmek icin kullanabiliriz
    // Status zaten isminden de anlaşılabileceği gibi sonucu göstermek için
    //
    Irp->IoStatus.Status      = STATUS_SUCCESS;
    Irp->IoStatus.Information = 0;

    //
    // Şu anki yığın yerini aliyoruz ve ardindan IOCTL kodumuzu buluyoruz
    //
    IrpStackLocation = IoGetCurrentIrpStackLocation(Irp);
    IOCTLcode        = IrpStackLocation->Parameters.DeviceIoControl.IoControlCode;

    DbgPrint("Kontrol kodu alindi! \n");

Burada yukarıda bahsettiğimiz bizim sürücümüze ait *IRP yığın yeri*ni `IrpStackLocation` değişkenine alıyoruz. Ardından bu yerde belirtilen *IOCTL* kodunu da `IOCTLcode` değişkenine alıyoruz, akabinde kontrol kodu aldığımıza dair bir debug mesajı yazdırıyoruz.

Burada sonra bizim switch deyimimiz geliyor. Yığın yerinden aldığımız koda göre farklı işlemler yapıyoruz. İşlemden sonra ise fonksiyon şöyle bitiyor.

    //
    // IRP islendikten sonra IRP'yi tekrar G/Ç yöneticisine gonderiyoruz
    // 2. parametre işlemcik için oncelik arttirabilir (gerekirse)
    // Bu sayede IRP'miz tekrar geldiği yere dönebilmis olucak
    //
    IoCompleteRequest(Irp, IO_NO_INCREMENT);
    // Bu NtStatus switch durumları içerisinde tekrar
    // belirlenecek, okumaya devam ehehe.
    return NtStatus;

IRP ile olan işimiz artık bittiği için G/Ç yöneticisine bunu bildirmemiz ve IRP'yi G/Ç yöneticisine göndermemiz gerekiyor. İşte bunu `IoCompleteRequest` fonksiyonuyla yapıyoruz. İlk parametre olarak işini bitirdiğimiz IRP'yi, diğer parametre olarak ise IRP'yi kullanan işlemcik için bir öncelik arttırması söz konusu mu değil mi onu belirliyoruz. Bu konuyu da aslında açabiliriz ama şu an pek ilgi alanımızda değil, zaten çoğu zaman da (en azından bizim için) kullanılan bir özellik olmayacak.

`IoCompleteRequest` çağırıldığında G/Ç yöneticisi yüksek seviyeli sürücülerin bu IRP için bir `IoCompletion` rutini tanımlayıp tanımlamadığına bakıyor, eğer tanımlıysa bu `IoCompletion` rutinlerini de çalıştırıyor. Bu rutinler için şöyle düşünebilirsiniz: son rütüşları yapıyor. Şimdilik bu düşünce yeterli olur, ileride bunun da ayrıntısına girmek var kafamda ama ne zaman Allah bilir..

## G/Ç Kontrol Kodu kullanımı (IOCTL)
**IOCTL** dediğimiz şey kullanıcı modu uygulamalarıyla çekirdek modundaki sürücünün haberleşmesi için kullanılır. Dahası, bu kontrol kodları sürücü yığınında(driver stack) bulunan diğer sürücülerle haberleşmek için de kullanılabilir. Bu yazının asıl konusunu oluşturan da tam olarak bu diyebiliriz.

Kullanıcı modundaki bir programın çekirdeki **IOCTL** göndermesi için yapması gereken şey `DeviceIoControl` fonksiyonunu gerekli parametrelerle çağırmak. Bu fonksiyon G/Ç yöneticisini kullanarak belirtilen en üst sürücüye bir adet `IRP_MJ_DEVICE_CONTROL` isteği gönderir, akabinde sürücü de bu isteği tanımladığı fonksiyon aracılığıyla işler.

Bazı IOCTL'ler kullanıcı tarafından tanımlanabildiği gibi bazıları ise sistem tarafından tanımlanmıştır. Sistem tarafından tanımlananlara açık(public), kullanıcılar tarafından tanımlananlara ise gizli(private) kontrol kodları deniyor. Zira sistemin tanımladığı kontrol kodları her yerde aynıyken, kullanıcının tanımladıkları kendi sürücüsüne özgü tanımlanmış kontrol kodları oluyor.

Biz yapacağımız her farklı türdeki veri transferi için ayrı bir IOCTL tanımlamalıyız. Bu nedenle şimdi bu IOCTL'lerin nasıl tanımlandığından bahsedelim.

### G/Ç kontrol kodlarının(IOCTL) tanımlanması
G/Ç kontrol kodları **32** bitlik bir değer olarak tanımlanır. Bunun bölümlenmesini de aşağıda görebilirsiniz.

![](/files/IOCTLbitleri.png)

Bir **IOCTL** oluşturmak için Windows'un sunduğu `Wdm.h` veya `Ntddk.h` içerisinde tanımlı olan `CTL_CODE` makrosunu kullanabiliriz. Bu makroyu merak edenler için göstereyim:

    #define CTL_CODE( DeviceType, Function, Method, Access ) (                 \
        ((DeviceType) << 16) | ((Access) << 14) | ((Function) << 2) | (Method) \
    )

Makro, tanımlayacağımız kontrol kodu için gereken değerleri alıp bunları yukarıda gösterdiğimiz yapıya göre birleştirir. Bu makroyu sürücümüzde kullanacağımız her **IOCTL** için aşağıdaki gibi kullanabiliriz.

    #define IOCTL_FalanFilan_IOCTL CTL_CODE(SurucuTip, FonksiyonKodu, Metod, ErisimBayraklari)

Burada kullandığımız parametreleri birazcık açıklamak gerekirse:

* **SurucuTip** : IOCTL'nin ait olduğu sürücü tipi. Buradaki değer sürücüyü oluştururken `IoCreateDevice` fonksiyonuna verdiğimiz tip ile aynı olmalı. Yani diğer bir değişle, buradaki tip ile `DEVICE_OBJET` yapısındaki tip aynı olmak zorunda.
* **FonksiyonKodu** : Sürücü tarafından çalıştırılacak fonksiyonun kodu. Bu değer `0x800`'ün yukarısında arasında olmalı. `0x800` ve aşağısı Microsoft tarafından ayrılmış.  
* **Metod** : Bu kısım önemli. İşletim sistemini veriyi sürücü ve `DeviceIoControl` fonksiyonunu çağıran kişi arasında nasıl ilettiğini belirtiyor. Farklı çeşitler var ve birazdan çoğuna değinecem.
* **Access** : Adından anlaşıldığı gibi, bu kontrol kodunu çağıracak kişinin sahip olması gereken izinleri belirtiyor. Kullanılabilecek izinler için [şuraya](https://msdn.microsoft.com/en-us/library/windows/hardware/ff543023(v=vs.85).aspx) bakmanızda fayda var.

Bunları gördükten sonra yazdığımız sürücünün kendi IOCTL kodlarını nasıl oluşturduğunu da görelim:

    //
    // Bizim tanimladigimiz aygıt tipi (0x8000-0xffff arasinda olmali)
    // dileyen FILE_DEVICE_UNKNOWN da kullanabilir pek tabi
    //
    #define FILE_DEVICE_BEK 0x8054

    //
    // IOCTRL tanimlamalarimiz
    // Function kodu 0x800 yukarisi bize ayrilmis
    // Access kismi bu IOCTLe nasil erisilecegini belirliyor!
    //
    #define IOCTRL_BEK_METHOD_BUFFERED \
            CTL_CODE(FILE_DEVICE_BEK, 854, METHOD_BUFFERED,   FILE_READ_DATA | FILE_WRITE_DATA)

    #define IOCTL_BEK_METHOD_NEITHER \
            CTL_CODE(FILE_DEVICE_BEK, 855, METHOD_NEITHER,    FILE_READ_DATA | FILE_WRITE_DATA)

    #define IOCTL_BEK_METHOD_IND \
            CTL_CODE(FILE_DEVICE_BEK, 856, METHOD_IN_DIRECT,  FILE_READ_DATA | FILE_WRITE_DATA)

    #define IOCTL_BEK_METHOD_OUTD \
            CTL_CODE(FILE_DEVICE_BEK, 857, METHOD_OUT_DIRECT, FILE_READ_DATA | FILE_WRITE_DATA)

Gördüğünüz gibi öncelikle bizim sürücümüz için bir tip belirledik. Bu tipi hem **IOCTL** oluştururken hem de `IoCreateDevice` fonksiyonunda kullandık. Böylece bu iki değer örtüşeceği için çağrıyı da yapabilecez.

Ardından kullanacağımız her transfer tipi için ayrı bir IOCTL oluşturduk. Bu da demektir ki şimdi sıra bu veri transfer tiplerini incelemeye geldi. Burada gördüğünüz her tip, bizim `BiDeviceControl` fonksiyonu içerisindeki switch deyimi ile yakalanacak, ve ona göre uygun olan kodlar çalıştırılacak.

İzinler olarak ise hem yazma hem de okuma yapmamıza izin veren `FILE_READ_DATA` ve `FILE_WRITE_DATA` sabitini bitsel veya ile birleştirerek kullandık. Dışarıdan sürücümüze istek geldiğinde, isteği yapan kişinin de bu izinlere sahip olması gerek. Aşağıda kullanıcı modu programını anlatırken muhtemelen unutucam, o yüzden siz unutmayın orda **CreateFile** ile sürücüye tutamak elde ederken burada belirttiğimiz izinleri de kullanıyoruz.

Bu arada, yine Windows tarafından sağlanan `DEVICE_TYPE_FROM_CTL_CODE` makrosuyla bu kontrol kodlarından sürücü tipini, `METHOD_FROM_CTL_CODE` makrosuyla ise kullanılan metodu öğrenebilirsiniz.

### Kontrol kodları için veri transfer tipleri
Yukarıdaki **IOCTL** kodlarımıza bakarsanız, 3. parametre, yani *metod* olarak kullandığımız farklı değerler söz konusu. İşte bunların her biri ayrı bir veri transferi tipini belirtiyor. Bakalım hangisi nasıl çalışıyormuş..

#### METHOD_BUFFERED transfer tipi
Bu sabit IOCT'in *buffered*(tamponlu? tamponlanmış?) tipini kullanacağını belirtiyor. İşletim sistemi bu tip kullanıldığı zaman non-paged bir sistem bufferı oluşturur. Giriş ve çıkış işlemleri için, örneğin sürücüye bir veri gelecekse sürücü çağırılmadan önce bu veri bu buffera kopyalanır, sürücü bir veri gönderecekse gereken işlem tamamlandıktan sonra yine veri bu buffera kopyalanır. Yani giriş ve çıkışlarda kullanılacak veri aynı alanı kullanmaktadır. Bu transfer tipi genelde küçük verilerin transfer edilmesi için uygundur. Bu metod tümden fiziksel hafıza kullanımını da azaltmış olur. Çünkü hafıza yöneticisi başka transfer tiplerindeki gibi belli bir fiziksel alanı kitlemek zorunda kalmaz. Bir alanın kitlenmesi demek ise sürekli hafızada kalmak zorunda olacağı demektir. Yani misal, büyük verilerle bunu kullansanız kocaman alanlar hafızada kilitli tutulacak. Haliyle bu da fiziksel hafıza kullanımını kötü etkileyecek. 

G/Ç yöneticisi bu metod kullanıldı mı diye belirlemek için 2 çeşit yol izleyebiliyor:

* `IRP_MJ_READ` veya `IRP_MJ_WRITE` major fonksiyonları kullanılacaksa device nesnesinin **Flags** bölümüne bakar. Eğer burada `DO_BUFFERED_IO` tanımlı ise hmm demek ki buffered I/O yapılacak der.
* `IRP_MJ_DEVICE_CONTROL` veya `IRP_MJ_INTERNAL_DEVICE_CONTROL` için ise **IOCTL** kodunun tranfer tipi bölümünün `METHOD_BUFFERED` olup olmadığına bakar.

Bu tranfer metodunda sistem bize `Irp->AssociatedIrp.SystemBuffer` alanıyla belirtilen bir `non-paged` yer sunar. `Non-paged` demek, buradaki verinin hiçbir zaman *page file*'a yazılmayacağı anlamına gelir. Şimdi diyeceksiniz ki page file ne? Hadi çık işin içinden şimdi.

İşletim sistemi fiziksel hafızanın müfrit kullanılması durumunda buradaki bazı verileri page file denilen bir dosyaya yazar (C: altında `pagefile.sys `olarak bulunur genelde). Eğer siz verinizin buraya yazılmamasını yani hep hafızada kalmasını istiyorsanız non-paged alan kullanmanız gerekir. Peki neden non-paged alan kullanmak isteriz derseniz bu defa konuya **IRQL** falan da girecek vallah işin içinden çıkamayız. Ama sözüm olsun bunlarla ilgili de yazacağım inşallah. 

Neyse... Şimdi, burası sürücümüz için hem veriyi alacağı, hem de bu veriye vereceği cevabı koyacağı yerdir. Alınacak verinin ve gönderilecek cevabın boyutu ise sırasıyla `IO_STACK_LOCATION` yapısındaki `Parameters.DeviceIoControl.InputBufferLength` ve `Parameters.DeviceIoControl.OutputBufferLength` alanlarıyla belirlenir. Bu değerlerden hangisi büyük ise `SystemBuffer` alanı da o büyüklüğe sahip olur. 

Tekrar hatırlatayım, buffered metodunda non-paged hafıza kullanımı söz konusu olacağı için büyük boyutta veri transferleri için kullanmamalısınız. Bu arada kusura bakmayın fakat tüm kavramları Türkçe'leştirerek anlatmak oldukça sıkıntılı. Bu nedenle arada kaçamaklar yapıyorum, zamanla buna da bir çözüm geliştirebiliriz umarım ülke olarak ehehe. 

Şimdiyse bu transfer tipi için kulandığımız switch durumunu görelim. Burada göstereceğimiz her durum bizim `BiDeviceControl` içerisinde bulunan switch deyiminde yer alıyor.

    case IOCTRL_BEK_METHOD_BUFFERED:
    {
        //
        // BUFFERED yönteminde hem girdi(input) hem de çıktı(output) aynı alanı kullanır
        // kullanicidan alinan veri sistemin oluşturduğu buffera kopyalanir yani non-paged hafiza isgali soz konusu
        // bu nedenle buyuk verilerle kullanmak pek mantikli gozukmuyor, kucuklerle kullanmaliyiz
        // 

        // Buradan aldığımız veriyi ekrana yazdırıyoruz, sonlandırıcı içermesi çok önemli.
        // Yine dikkat ederseniz hem girdi hem de çıktı alanlarımız aynı
        pInputBuffer  = Irp->AssociatedIrp.SystemBuffer;
        pOutputBuffer = Irp->AssociatedIrp.SystemBuffer;

        DbgPrint("IOCTRL_BEK_METHOD_BUFFERED Alindi! \n");
        DbgPrint("[BEK_BUFFERED] Kullanici dedi ki : %s", pInputBuffer);
        
        //
        // Kernelden donecek mesaj output alaninina sigiyor mu?
        //
        if (IrpStackLocation->Parameters.DeviceIoControl.OutputBufferLength >= ReturnSize)
        {
            //
            // Sığıyor,
            // Kernelin cevabini OutputBuffera alalim ve ne kadarlik mesaj gonderdiğini belirtelim
            //
            RtlCopyMemory(pOutputBuffer, pReturnData, ReturnSize);
            
            Irp->IoStatus.Information = ReturnSize; //Gönderdiğimiz veri boyutu burda
            NtStatus = STATUS_SUCCESS;
            
            //
            // Yine hatırlarsanız girdi ve çıktı alanımız aynıydı
            // yani bize gelen verinin üstüne yazmis olacagiz
            // bunu görmek için şöyle bir test yapalım
            // Burada ilk değerin değiştiğini göreceksiniz
            //
            DbgPrint("[BEK_BUFFERED] Kullanici cikarken dedi ki : %s", pInputBuffer);
        }
        else
        {
            // Siğmadi ehehe.
            NtStatus = STATUS_BUFFER_TOO_SMALL;
        }
    }break;

#### METHOD_NEITHER transfer tipi (Ne o ne de bu transfer tipi ehehe)
Bu transfer tipi kullanılırken direkt olarak kullanıcı tarafındaki sanal adrese ulaşım söz konusudur. Yani işletim sistemi bize veriyi almamız için sistem tarafından tanımlanan bir **tampon**(buffer) veya **MDL** vermez. Bunun yerine direkt olarak girdi ve çıktı veri alanlarının kullanıcı tarafından sunulan adresini verir. 

Burada hemen şunu belirtmem lazım, direk olarak adres verildiği için doğru işlemciğin bağlam alanında(context) olmamız çok önemli. Şimdi context falan diyince tabi biraz beyin yanıyor ama salt bunu açıklamaya girsek içinden nasıl çıkacağız bilemiyorum ehehe. Ayrıca tarzanca olarak yazmayı sevmiyorum ama buna uygun Türkçe bir çeviriye tatmin olamadım ben, fikri olan? Sonradan düzenleme: Öneri gelmeyince kendi kullandığım "bağlam alanı" olarak çevirmeye karar verdim, hadi hayırlısı..

Hülasa edersek, işletim sisteminde çalışan her işlem birbirinden izole hafıza alanlarında çalışmaktadır. (İşlemcik(Thread) kısmına girmiyorum, yüzeysel özet geçiyorum) Yani mesela A işlemi ile B işleminin çalıştığı hafıza alanları farklı ve izoledir. Fakat, sanal hafıza yönetimi sayesinde mesela A prosesindeki **XXXX** adresinde "*bek*" yazıyorken, B prosesindeki yine aynı **XXXX** adresinde "*beko*" yazıyor olabilir. Bu, işlemlerin hafıza alanlarının sanal hafıza yöneticisi tarafından farklı fiziksel adreslerle ilişkilendirilmesi ile gerçekleşir. İşte bu nedenle, bu transfer tipinde direkt olarak kullanıcında aldığımız adresi kullanacağımız için `DeviceIoControl`'u çağıran işlemciğin hafıza alanı içerisinde olmalıyız. Başka yerde olursak, farklı bir veriye ulaşmış olabiliriz hatta kuvvetle muhtemel öyle de oluruz. Peki doğru işlemciğin bağlam alanında çalışmayı nasıl garantileriz? Benim bildiğim yalnızca sürücü ağacında __en üstte bulunan sürücüler__ bunu sağlayabiliyor. Yani bu transfer tipini en üstte bulunan sürücüler için kullanmamız gerektiğini söylesem sanırım hata etmiş olmam. 

*Tam burda aklıma takıldı yahu, bu sümüklü böcekler acaba yağmur yağdığında yerde daha rahat sürünebildikleri yahut güneşli ortamda ıslaklıkları kuruduğu için mi ortaya çıkıyorlar? Yani bi sebebi de bu mudur acaba ehhe. Fikri olan?*

G/Ç yöneticisi bu metodun kullanıp kullanılmadığını öğrenmek için iki farklı durumda şu şekilde davranıyor:

* `IRP_MJ_READ` veya `IRP_MJ_WRITE` major fonksiyonları için `DO_BUFFERED_IO` veya `DO_DIRECT_IO` sabitlerinin `DEVICE_OBJECT` içerisindeki **Flags** alanında kullanılıp kullanılmadığına bakıyor.
* `IRP_MJ_DEVICE_CONTROL` veya `IRP_MJ_INTERNAL_DEVICE_CONTROL` major fonksiyonları için ise *IOCTL* kodunun transfer tipi bölümünün `METHOD_NEITHER` olup olmadığına bakıyor

Yine bu metodu kullanırken işletim sistemi bize gelen verinin adresini `IO_STACK_LOCATION` içersinde bulunan `Parameters.DeviceIoControl.Type3InputBuffer` alanında belirtiyor. Dediğimiz gibi sistem burayla ilgili herhangi bir doğrulama yapmadan yapar bunu. Bu nedenle siz veriye ulaşmadan önce kendi kontrollerinizi yapmalısınız(aşağıda değinecem).

Çekirdeğin veri göndermek için kullanacağı alan ise `Irp->UserBuffer` ile belirtiliyor. Yine bu adres de kullanıcı tarafından belirlenmiş olduğu için buraya yazma yapmadan önce de gereken kontrollerinizi yapmalısınız.

Son olarak yine sırasıyla girdi ve çıktı boyutlarının `IO_STACK_LOCATION` yapısındaki `Parameters.DeviceIoControl.InputBufferLength` ve `Parameters.DeviceIoControl.OutputBufferLength` ile belirtildiğini söyleyeyim.

Microsoft bu transfer tipinin kullanılması durumunda birtakım önlemleri almamız gerektiğini söylüyor. Az önce dediğimiz gibi veri okumak ve göndermek için kullanıcı modundaki bir adresi kullanacağımız için doğrulama yapmamız gerekiyor. Yazma ve okuma yapacağımız için bu testleri `ProbeForWrite` ve `ProbeForRead` fonksiyonları ile yapabiliriz. Ayrıca, `ProbeForXXX` fonksiyonları çalışması sırasında kullanıcının tamponun erişim haklarında bir değişiklik yapmaması için bu işlemi bir try-except bloğu içerisinde yapmalıyız. Bu sayede `ProbeForXXX` fonksiyonlarının oluşturduğu istisnaları(exception) yakalayıp ona göre işlem yapabiliyor olacağız.

Aslında direkt olarak kullanıcı adresine erişmektense bir iki farklı şekilde de veri transferini gerçekleştirebiliriz örneğin kullanıcın verdiği bu alanları tanımlayan **MDL** oluşturarak veyahut buffered metodunda G/Ç yöneticisinin yaptıklarını manuel olarak yaparak fakat konunu dağılmaması adına buna girmiyoruz biz direkt olarak kullanıcının verdiği adreslere göre işlem yapalım.

Şimdiyse bu transfer tipi için kullandığımız switch durumunu görelim.

    //
    // Bu kontrol kodu ise NEITHER BUFFER NOR Direct I/O metodunu kullaniyor!
    // Bu metodu kullanirken direkt olarak kullanıcı modu adresine erisiyoruz
    // Bu nedenle dogru işlemciğin bağlam alanında olmamız aşırı aşırısı onemli
    //
    case IOCTL_BEK_METHOD_NEITHER:
    {
        // Girdi ve Çıktı alanlarımızı tanımlayalım
        pInputBuffer  = IrpStackLocation->Parameters.DeviceIoControl.Type3InputBuffer;
        pOutputBuffer = Irp->UserBuffer;

        DbgPrint("IOCTL_BEK_METHOD_NEITHER Alindi! \n");

        //
        // try except lazim cunku ProbeForRead & ProbeForWrite basarisiz olabilir!
        //
        __try {
            //
            // ProbeForRead fonksiyonu kullanıcı modundaki bufferının hakikaten kullanıcı modu adres alanında oldugunu, okunabilir
            // durumda oldugunu ve dogru hizalanmis oldugunu dogruluyor. Degilse STATUS_ACCESS_VIOLATION döndürür.
            //
            ProbeForRead(pInputBuffer,
                IrpStackLocation->Parameters.DeviceIoControl.InputBufferLength,
                TYPE_ALIGNMENT(char)
                );
            
            DbgPrint("[BEK_NEITHER] Kullanici dedi ki : %s", pInputBuffer);

            //
            // OutputBuffer boyutunun veriyi alabilecek buyuklukte oldugunu dogruluyoruz
            //
            if (IrpStackLocation->Parameters.DeviceIoControl.OutputBufferLength >= ReturnSize)
            {
                //
                // ProbeForWrite ise ProbeForRead'in yaptigini yazilabilirligi dogrulayarak yapiyor
                // yazilabilir degilse STATUS_ACCESS_VIOLATION.
                //
                ProbeForWrite(pOutputBuffer,
                    IrpStackLocation->Parameters.DeviceIoControl.OutputBufferLength,
                    TYPE_ALIGNMENT(char)
                    );
                
                //
                // RtlCopyMemory = memcpy
                // ardindan ne kadar veriyi yazdigimizi da Irp yapisina bildiriyoruz
                //
                RtlCopyMemory(pOutputBuffer, pReturnData, ReturnSize);
                Irp->IoStatus.Information = ReturnSize;
                NtStatus = STATUS_SUCCESS;

                //
                // Bu defa Inputumuz bizde kalacak, ayri bufferlar var cunku
                //
                DbgPrint("[BEK_NEITHER] Kullanici cikarken dedi ki : %s", pInputBuffer);
            }
            else {
                //
                // Sigmadi :)
                //
                NtStatus = STATUS_BUFFER_TOO_SMALL;
            }

        }
        __except (EXCEPTION_EXECUTE_HANDLER) {
            NtStatus = GetExceptionCode();
        }
    }break;


#### METHOD_IN_DIRECT ve METHOD_OUT_DIRECT transfer tipi 
Direkt içeri veya direkt dışarı transfer metodunu *büyük boyutlu* verileri transfer etmek için kullanılıyor. İsimlerinden anlayabileceğiniz gibi `METHOD_IN_DIRECT` sürücüye veri göndermek için, `METHOD_OUT_DIRECT` ise sürücünün dışarıya cevap vermesi için kullanılıyor. İşletim sistemi kullanıcı tarafından verilen alanı hafızada kitliyor. Ardından bu alanı tanımlayan bir MDL oluşturuyor. Biz de bu MDL'i kullanarak veriye güvenli bir şekilde ulaşabiliyoruz. Bu yöntemin güzel tarafı büyük verilerle kullanmaya elverişli olması, kötü tarafı ise kullanıcı modundaki hafızanın IRP'nin işi görülene kadar kilitli kalacak olması..

Bu transfer tipinde sistem bize `Irp->AssociatedIrp.SystemBuffer` alanında belirtilen bir tampon bölge(tarzanca buffer) veriyor. Burası bize verinin geldiği yer. Tıpkı buffered tipindeki gibi. Gelen verinin uzunluğu da diğer tiplere benzer şekilde `IO_STACK_LOCATION` yapısının `Parameters.DeviceIoControl.InputBufferLength` alanında bulunuyor.

G/Ç yöneticisi bu metodun kullanıp kullanılmadığını öğrenmek için iki farklı durumda şu şekilde davranıyor:

* `IRP_MJ_READ` veya `IRP_MJ_WRITE` major fonksiyonları için `DO_DIRECT_IO` sabitinin `DEVICE_OBJECT` içerisindeki **Flags** alanında kullanılıp kullanılmadığına bakıyor.
* `IRP_MJ_DEVICE_CONTROL` veya `IRP_MJ_INTERNAL_DEVICE_CONTROL` major fonksiyonları için ise **IOCTL** kodunun transfer tipi bölümünün `METHOD_IN_DIRECT` veya `METHOD_OUT_DIRECT` olup olmadığına bakıyor.

Her iki direkt transfer tipinde de sistem bize ayrıca `Irp->MdlAddress` ile gösterilen bir **MDL**(Memory Descriptor List) veriyor. Burasını isterseniz çıktı isterseniz de girdi olarak kullanabilmeniz mümkün.

Burada bize verilen MDL'i kullanırken `MmGetSystemAddressForMdlSafe` makrosunu kullanarak MDL'i tanımladığı fiziksel alana sorunsuzca erişebileceğimiz bir sanal sistem adresi elde ediyoruz. Makroyu merak edenler için:

	#define MmGetSystemAddressForMdlSafe(MDL, PRIORITY)                    \
	     (((MDL)->MdlFlags & (MDL_MAPPED_TO_SYSTEM_VA |                    \
	                        MDL_SOURCE_IS_NONPAGED_POOL)) ?                \
	                             ((MDL)->MappedSystemVa) :                 \
	                             (MmMapLockedPagesSpecifyCache((MDL),      \
	                                                           KernelMode, \
	                                                           MmCached,   \
	                                                           NULL,       \
	                                                           FALSE,      \
	                                                           (PRIORITY))))

Görüldüğü üzre kendisi verdiğimiz MDL'e bakarak eğer sistem hafızasına zaten eşitlenmiş ise o değeri bize veriyor(MDL->MappedSystemVa), diğer durumda ise MDL'nin belirttiği fiziksel alanı `MmMapLockedPagesSpecifyCache` fonkiyonunu kullanarak çekirdek modunda bir sanal adrese eşliyor, map ediyor ve bize bu adresi veriyor.. (Yahu bu map etmeyi ne diye çevirecez yaa?) Bunu yapmamızın sebebiyse sürücümüzün IRP'yi işlemesi sırasında, isteğin yapıldığı işlemin hafıza alanında olmama ihtimali. Bu nedenle bu makro yardımıyla kullanıcı tarafından kullanılan fiziksel adresi sistem hafızasına da eşliyoruz(map ediyoruz, bağlıyoruz vs.).

Yine bu `Irp->MdlAddress` alanının boyutu da `IO_STACK_LOCATION` içerisindeki `Parameters.DeviceIoControl.OutputBufferLength` alanında belirtiliyor. 

Şimdiyse bu transfer tipi için kullandığımız switch durumunu görelim. Kodda mümkün mertebe yorum satırları kullandım, sanıyorum tekrar açıklamaya gerek yoktur. Fakat pek tabi merak ettiğiniz konularda mail atabilir veya yorumlardan iletişebilirsiniz eheh.

    //
    // Bu kontrol kodu ise DIRECT IN metodunu kullanıyor!
    //
    case IOCTL_BEK_METHOD_IND:
    {
        //
        // DIRECT IN/OUT metodunu kullanirken kernel bize bir adet MDL veriyor (Irp->MdlAddress)
        // Input degerimiz ise AssociatedIrp.SystemBuffer icerisinde yer aliyor.
        // Bize verilen MDL bizim output alanimizi belirliyor, fakat bu alani hem input hem output icin
        // kullanabiliriz, burada rajona uyduk ve input aldigimiz icin outputa bir sey yapmadik.
        //

        pInputBuffer = Irp->AssociatedIrp.SystemBuffer;
        
        DbgPrint("[BEK_METHOD_IND] Kullanici dedi ki : %s", pInputBuffer);
        
        //
        // Hiç yazma yapmadik diger degerlere dokunmuyoruz. Information alani zaten en basta ayarlanmisti.
        //
        NtStatus = STATUS_SUCCESS;
    }break;

    //
    // Bu kontrol kodu ise DIRECT OUT metodunu kullanıyor!
    // Bu defa biz kullanıcı moduna bir sey gonderecegiz, fakat dediğim gibi istersek alabiliriz de yine
    //
    case IOCTL_BEK_METHOD_OUTD:
    {
        pOutputBuffer = NULL;
        
        DbgPrint("IOCTL_BEK_METHOD_OUTD geldi! Mesaj gonderiyorum!");

        //
        // Dogrulama yapmamiz lazim, yoksa BSOD alabiliriz. Kullaniciya guvenme!
        //
        if (Irp->MdlAddress)
        {
            pOutputBuffer = MmGetSystemAddressForMdlSafe(Irp->MdlAddress, NormalPagePriority);
        }
        else
        {
            NtStatus = STATUS_UNSUCCESSFUL;
        }

        //
        // Bi outputbuffer elde edebildiysek, ve Output alanimiz verimiz icin yeterliyse 
        //
        if (pOutputBuffer && IrpStackLocation->Parameters.DeviceIoControl.OutputBufferLength >= ReturnSize)
        {
            //
            // Veriyi kopyalayip ardindan ne kadar veri yazdigimizi ve durumu bildiriyoruz
            //
            RtlCopyMemory(pOutputBuffer, pReturnData, ReturnSize);
            
            Irp->IoStatus.Information = ReturnSize;
            NtStatus = STATUS_SUCCESS;
        }
        else
        {
            // Sığmadı ehehe.
            NtStatus = STATUS_BUFFER_TOO_SMALL;
        }
    }break;

## Unload ve BiDefaultDispatch
Çekirdek tarafında son olarak sürücünün kaldırılmasını ve kullanmadığımız major fonksiyonların çağırılması durumunda çalışacak olan `BiDefaultDispatch` fonksiyonunu görelim.

    VOID BiUnload(IN PDRIVER_OBJECT pDriverObject)
    {
        //
        // DriverEntry'de olusturdugumuz sembolik bağlantı
        // ve tabiki device nesnesini siliyoruz
        //
        IoDeleteSymbolicLink(&unicodeDriverDeviceLink);
        IoDeleteDevice(pDriverObject->DeviceObject);

        DbgPrint("Sürücü kaldirildi! \n");
    }

    NTSTATUS BiDefaultDispach(
        IN PDEVICE_OBJECT pDeviceObject,
        IN PIRP Irp)
    {
        UNREFERENCED_PARAMETER(pDeviceObject);

        Irp->IoStatus.Status      = STATUS_SUCCESS;
        Irp->IoStatus.Information = 0;

        IoCompleteRequest(Irp, IO_NO_INCREMENT);

        return STATUS_SUCCESS;
    }

Bu iki küçük fonksiyonda pek açıklanacak bir şey yok. `Unload` fonksiyonu `DriverEntry`'de oluşturduğumuz sembolik bağlantıyı ve aygıtımızı siliyor. `BiDefaultDispatch` ise **Irp** yapısında sonucun başarılı olduğunu belirtip **Irp**'yi tekrar *G/Ç yöneticisi*ne yönlendiriyor.

## Kullanıcı modundan sürücüye veri gönderme
Şimdiyse sıra kullanıcı modundan sürücümüz ile iletişime geçmekte. Bunun için `DeviceIoControl` fonksiyonunu kullanacağız. Fonksiyonun prototipi aşağıdaki gibi:

    BOOL WINAPI DeviceIoControl(
      _In_        HANDLE       hDevice,
      _In_        DWORD        dwIoControlCode,
      _In_opt_    LPVOID       lpInBuffer,
      _In_        DWORD        nInBufferSize,
      _Out_opt_   LPVOID       lpOutBuffer,
      _In_        DWORD        nOutBufferSize,
      _Out_opt_   LPDWORD      lpBytesReturned,
      _Inout_opt_ LPOVERLAPPED lpOverlapped
    );

Hemen ilk parametrenin sürücümüze tutamak olduğunu görüyoruz. Bu durumda öncelikle sürücümüze bir tutamak elde etmemiz gerekiyor. Bunun için `CreateFile` kullanabiliriz (Diğer parametrelere değinecez).

    int _tmain(void) {
        DWORD retByte;
        NTSTATUS status;
        TCHAR kernelDediKi[256] = { 0 };        // Bu bizim gelecek veriyi tutacak alanımız olacak
        LPCWSTR DevicePath = L"\\\\.\\beirp";  // Aygıtımızın ismi
        HANDLE hDeviceHandle = INVALID_HANDLE_VALUE;


        hDeviceHandle = CreateFileW(
            DevicePath,                       // Açılacak dosya/aygıt ismi
            GENERIC_READ | GENERIC_WRITE,     // İzinleri nerede kullanmıştık, hatırladınız mı?
            0,
            NULL,
            OPEN_EXISTING,                    // Dosyayı/aygıtı aç, eğer yoksa hata dönecek
            FILE_ATTRIBUTE_NORMAL,
            NULL
            );

Gördüğünüz gibi tek yaptığımız şey `CreateFile` fonksiyonunu kullanarak bizim sürücümüze bir tutamak elde etmek. Kullandığım parametrelerin anlamı için `CreateFile` fonksiyonunu **MSDN** sayfasını<sup>[8](https://msdn.microsoft.com/en-us/library/windows/desktop/aa363858(v=vs.85).aspx)</sup> ziyaret edebilirsiniz.

Tutamağı elde ettikten sonra sırayla kullanacağımız her transfer tipi için `DeviceIoControl` fonksiyonunu çalıştıracağız. Bunların nasıl yapıldığını da aşağıdaki kodlarda görebilirsiniz. Ama hemen öncesinde `DeviceIoControl` fonksiyonunun parametrelerine kısaca değinelim böylece aşağıdaki kodu tek tek açıklamak zorunda kalmayalım.. Prototipini yukarıda göstermiştim, kullandığımız parametreleri sırayla açıklamak gerekirse:

* hDevice            : İşlem yapılacak aygıta tutamak
* dwIoControlCode    : Gönderilecek kontrol kodu
* lpInBuffer         : Gönderilecek veri
* nInBufferSize      : Gönderilecek verinin boyutu
* lpOutBuffer        : Gelecek verinin konulacağı alan
* nOutBufferSize     : Gelecek veri için ayrılan alanın boyutu
* lpBytesReturned    : OutBuffer'a yazılan veri boyutunu döndürüyor

Tabi şunu da söyleyeyim, ben yer ve zaman sıkıntısı gereği bu fonksiyonları biraz yüzeysel anlatıyorum. Oysa ki bu fonksiyonlar farklı durumlarda döndüğü farklı değerler var. İşte onlara göre de başka işlemler yapmanız gerekebilir. Bir tek bu fonksiyonlar için değil, çoğu fonksiyon için bu dediklerim geçerli. O nedenle bir fonksiyonu kullanmadan önce en azından microsoftun fonksiyon açıklamasını hatim etmeniz önemli.

Son olarak bunlar da kullanıcı modundaki programımızın veriyi gönderdiği/aldığı kısımlar.. Yukarıdaki prototip açıklamasına göre kodları okumak zor olmayacaktır diye umuyorum.. Merak edenler için `ZeroMemory` fonksiyonu belirtilen alanı belirtilen boyutta temizliyor, sıfırlıyor böylece eski ile yeni birbiriyle karışmıyor..

    //BUFFERED olarak gonderiyoruz
    status = DeviceIoControl(
        hDeviceHandle,
        IOCTRL_BEK_METHOD_BUFFERED,
        "3 kilo muz getir :)",
        sizeof("3 kilo muz getir :)"),
        kernelDediKi,
        sizeof(kernelDediKi),
        &retByte,
        NULL
        );
    
    _tprintf("Okunan: %lu \n", retByte);
    _tprintf("Kernel buffered dedi ki: %s \n", kernelDediKi);
    ZeroMemory(kernelDediKi, sizeof(kernelDediKi));
    
    //NEITHER olarak gonderiyoruz
    status = DeviceIoControl(
        hDeviceHandle,
        IOCTL_BEK_METHOD_NEITHER,
        "3 kilo muz getir :)",
        sizeof("3 kilo muz getir :)"),
        kernelDediKi,
        sizeof(kernelDediKi),
        &retByte,
        NULL
        );

    _tprintf("Okunan: %lu \n", retByte);
    _tprintf("Kernel neither dedi ki: %s \n", kernelDediKi);
    ZeroMemory(kernelDediKi, sizeof(kernelDediKi));
    
    //DIRECT_IN metodu
    status = DeviceIoControl(
        hDeviceHandle,
        IOCTL_BEK_METHOD_IND,
        "3 kilo muz getir :)",
        sizeof("3 kilo muz getir :)"),
        NULL,
        0,
        &retByte,
        NULL
        );

    _tprintf("Kernele input gonderdik, veri almiyoruz.\n");

    // DIRECT_OUT metodu
    status = DeviceIoControl(
        hDeviceHandle,
        IOCTL_BEK_METHOD_OUTD,
        NULL,
        0,
        kernelDediKi,
        sizeof(kernelDediKi),
        &retByte,
        NULL
        );
    
    _tprintf("Kernelden yine veri geldi : %s \n", kernelDediKi);

Kodlarda kullandığım `_tprintf` kafanızı karıştırmasın. Hemen hemen `printf` ile aynı çalışıyor. Yalnızca tanımladığınız stringlerin nasıl işleneceğiyle alakalı bir şey. İşte unicode kullanılıp kullanılmadığı durumlarına göre bu `_wprintf` ya da normal `printf`'i çağırıyor diyeyim şimdilik. Ayrıntılı bilgi için MSDN'e başvurabilirsiniz.

## Çekirdek - Kullanıcı arası iletişimin testi
Evvet, hem kullanıcı modu için hem de çekirdek için gereken sürücüyü ve uygulamayı yazdığımıza göre şimdi teste geçebiliriz. Önceki konularda bahsettiğim bir sürücü yükleyiciyle sürücünüzü yükledikten sonra kullanıcı modu programımızı çalıştırırsanız bir hata yapmamış olmanız önkabulune dayanarak aşağıdaki şekilde bir sonuç elde etmeniz gerek..

![](/files/cekirdekkullaniciiletisimi.png)

Kısaca özetlersek, öncelikle kullanıcı modu **buffered** metodunu kullanarak bir veri gönderiyor çekirdek bu mesajı alıp debug mesajı olarak yazdırdıktan sonra cevap olarak döneceği veriyi gelen verinin üzerine yazıyor çünkü hatırlarsanız bu metodda hem girdi hem çıktı için aynı yer kullanılıyordu. (`Irp->AssociatedIrp.SystemBuffer`) Bunun doğrulaması olarak *buffered* yöntemini kullanaran kısımdan çıkışı yapılırken veri tekrar ekrana yazılıyor ve görüldüğü üzere değişmiş oluyor.

Ardından kullanıcı modu uygulamamız **NEITHER** metodunu kullanarak sürücüye tekrar bir veri gönderiyor. Bu metodda kullanılar alanlar farklı olduğu için gelen verimiz ekranda görüldüğü üzere korunmuş oluyor. Hatırlarsanız bu transfer tipinde direkt olarak kullanıcı tarafından verilmiş olan adreslere erişiyoruz. Son olarak kullanıcı modu uygulamasına bakılırsa sürücüden gelen mesaj ekranda görünüyor.

Daha sonra ise sırasıyla **DIRECT_IN** ve **DIRECT_OUT** trasfer tipi kullanılıyor. Önce kullanıcı modu uygulaması sürücüye bir veri gönderiyor(*DIRECT_IN*) sürücü ise bu mesajı alıp ekrana yazıyor. Akabinde ise *DIRECT_OUT* transfer tipi ile kullanıcı uygulaması sürücüden bir veri istiyor. Sürücümüz ise talebi aldığını belirtip veriyi gönderiyor son olarak da bu veri kullanıcı tarafında ekrana yazdırılıyor.

Her ne kadar bu yazıdaki örneğimiz kısıtlı gibi gözükse de tek sahip olmanız gereken şey aslında hayal gücü. Biz muzlu bişiyler kullandık veri olarak ama düşünün, bunun yerine çekirdekte birtakım veriler elde edip bunları kullanıcı tarafına gönderebilirsiniz. Buna ne mi gerek var? Çünkü her istediğinize kullanıcı modundan direkt olarak ulaşamıyorsunuz. Ama araya bir sürücüyü yardımcı olarak koyarsanız bu sayede direkt çekirdek modundan bilgi alabiliyorsunuz. 

Yine bildiğiniz üzere sorularınız ve anlatılmasını istediğiniz konular için(elimden geldiğince tabii) iletişim bölümünden bana ulaşabilirsiniz. Yazıdaki hatalar için de keza..

Sevgiler.

---
* Dinlenilenler [1](https://www.youtube.com/watch?v=xEiZ39qBRwo), [2](https://www.youtube.com/watch?v=GF5SlU9YA70), [3](https://www.youtube.com/watch?v=DWaB4PXCwFU), [4](https://www.youtube.com/watch?v=FYCugFXjYxI)
