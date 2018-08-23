---
title: Kancalama Sanatı - SSDT
---

Selamlar.

Bu yazıda elimden geldiğince Windows işletim sisteminde SSDT kancalama(Hook) nasıl yapılır onu göstermeye çalışacağım. Öncelikle şunu söylemeliyim ki oldukça geniş bir konu. Çünkü sistemin kendisi ile haşır neşir oluyoruz. Her yerden fışkıran veri yapıları, fonksiyonlar, mantıkı çıkarımlar vesaire oldukça uzuyor konu.. Sırf yazacağımız kernel-mode sürücüsünün derlenmesi için bile ayrı yazılar var. O nedenle dikkatli takip etmeye çalışın, ayrıca takıldığınız kısımlar için yorum yahut e-mail yolu ile lütfen iletişin. Son olarak yazı biraz aceleye geleceği için içerisinde yazım ve bilgi hataları olabilir, yakalayan arkadaşlar lütfen iletişin benimle. (İletişmek?)

## [SSDT](http://en.wikipedia.org/wiki/System_Service_Dispatch_Table) ve SSDT kancalama nedir?
SSDT demek basitçe 4 adet SST(System Service Table) demektir. Bir sistem çağrısı yapıldığında işleyecek olan fonksiyon bu tablolara bakılarak bulunur. Bu tabloların kancalanması demek ise, bu tabloda bulunan bir fonksiyon adresinin, kernel modda yüklenmiş herhangi bir modül içinde aynı prototipe sahip başka bir fonksiyon adresi ile değiştirilmesidir. Bu sayede örneğin **NtCreateFile** API'si çağrıldığında sistemin kendi gerçek fonksiyonu değil de, sizin tanımladığınız kanca fonksiyon çağırılacak ve ardından sizin insafiyetinize göre asıl fonksiyon tekrar çağırılacaktır. Bu basit mantıki çıkarım, günümüz rootkitlerinin, koruma, izleme yazılımlarının temelidir. Mesela şöyle bir şey düşünün: sistemde dosya silen API'yi kancaladınız, ve bu sayede silinmek istenen dosyanın adı "bekiko.txt" ise dosyanın silinmesini engellediniz. Tebrikler! Böylece sistemde ilk velveleye verme maceranızı (hayali de olsa) yaşamış oldunuz. Bu örneğimiz biraz kötü niyetli gibi bir örnekti, bunun başka versiyonu da anti-virüs yazılımları için geçerli. Onlar da sisteminizi korumak, izlemek için bu kancalama işlemlerini gerçekleştiriyorlar.

![](/files/kancalamamantik.png)

Devam edersek, önceden yazdığım [şu](/posts/api-cagrilari-system-call-dispatcher-ve-dahasi.html) yazıda anlattığımız sistem çağrı mekanizmasının kalbi diyebileceğimiz tablo işte bu tablodur. Okumayanların bu yazıya devam etmeden önce, yukarıda link verdiğim yazıyı okuması faydalı olacaktır. Okuyanlar için kısa bir özetle devam edelim. Hatırlarsanız bu sistem çağrıları iki şekilde gerçekleşebiliyordu:

* SYSENTER yardımı ile (Windows XP ve sonrası, donanım olarak x86 Pentium II ve üzeri)
* 2e kesmesi ile (İlk Windows XP sürümleri ve daha eski sürümler)

Her ne kadar bu iki yöntemin çalışma biçimi birbirinden tamamen farklı olsa da, verdikleri sonuç aynıydı hatırlarsanız. Şimdi hızlıca bir özet geçelim, ayrıca bir iki yeni bilgi öğrenelim. Öncelikle **NtCreateFile** API'si çağrıldığında ne oluyordu? Hatırlayalım:

![](/files/callCFile.jpg)

*32 bit Windows 7* sistemimde *NtCreateFile* için **42** index numarası kullanılıyor. Şimdi bu index numarası hakkında birkaç şey öğrenelim. Dikkatinizi çekmek istediğim nokta şu, burada index değerimiz **EAX** yazmacına, yani **32 bitlik** bir yazmaca alınıyor. 32 bitlik bir sayının index olarak kullanılması demek, SST tablosunun 4GB uzunlukta olabilmesi demektir, ki bu da kulağa doğru gelmiyor. İşin doğrusu bu index numarası da aşağıdaki grafikte göreceğiniz üzere ayrılarak kullanılıyor:

![](/files/sservicenumber.png)

Grafikten anladığımız kadarıyla:

1. 0-11 bitler  -> Çağırılacak sistem servis numarası
2. 12-13 bitler -> Kullanılacak SST
3. 14-31        -> Kullanılmıyor

Yani, düşük seviyeli 12 bit sistem servis numarasını verdiğine göre tablonun uzunluğu `4096 byte` olur. Böylece az önce gördüğümüz yanlışlık (4GB olma durumu) düzeltilmiş oluyor. Ayrıca dikkat ederseniz, 2 bitlik bir alanı da kullanılacak SST'yi seçmek için kullanıyoruz. Yani bu demektir ki toplamda 4 (2<sup>2</sup>) tane SST olabilir. Windows bunlardan ikisini şu isimlerle kullanıyor:

1. KeServiceDescriptorTable       -> SST bitleri 0x00, Fonk. Index 0x0 – 0xFFF arası bu tabloda
2. KeServiceDescriptorTableShadow -> SST bitleri 0x01, Fonk. Index 0x1000 – 0x1FFF arası ise bu tabloda

Burada `KeServiceDescriptorTable` **ntoskrnl.exe** tarafından ihraç edilmiş durumda fakat `KeServiceDescriptorTableShadow` için aynısı geçerli değil. Bu tabloların yapısı SST olarak adlandırılan aşağıdaki şekilde tanımlanıyor.

	struct _SYSTEM_SERVICE_TABLE{
	    PULONG ServiceTableBase;        //Tablonun başlangıçı, fonksiyon adresleri bu adreste başlıyor
	    PULONG ServiceCounterTableBase; //Kullanılmıyor
	    ULONG NumberOfServices;         //Toplam servis sayısı, tablo limiti
	    PUCHAR ParamTableBase;          //System Service Parameter Table
	}

SST yapılarının tanımlı bulunduğu SDT(Service Descriptor Table) yapısı ise aşağıdaki gibi oluyor:
	
	struct _SERVICE_DESCRIPTOR_TABLE{
	    SYSTEM_SERVICE_TABLE ntoskrnl;      //SSDT   
	    SYSTEM_SERVICE_TABLE win32k;        //SSSDT(Shadow system service descriptor table) 
	    SYSTEM_SERVICE_TABLE Table3;        //Sürücülerin kullanımı için ayırılmış 
	    SYSTEM_SERVICE_TABLE Table4;        //Sürücülerin kullanımı için ayırılmış
	}

Şimdi kernel modda debugging yaparken SST yapısını kısaca gözlemleyelim. Bunun için `nt!KeServiceDescriptor` ile başlayan sembollere bakarak SDT elemanlarını bulabiliriz.

	kd> x nt!KeServiceDescriptor**
	82bb0a00          nt!KeServiceDescriptorTableShadow = <no type information>
	82bb09c0          nt!KeServiceDescriptorTable = <no type information>

`dps` komutunu kullanarak `nt!KeServiceDescriptorTable` içeriğine bakalım:

	kd> dps nt!KeServiceDescriptorTable L4
      82bb09c0  82ab76f0 nt!KiServiceTable
	  82bb09c4  00000000
	  82bb09c8  00000191
	  82bb09cc  82ab7d38 nt!KiArgumentTable

Gördüğünüz gibi üstteki `_SYSTEM_SERVICE_TABLE` yapımızı elde ettik. `82ab76f0` adresindeki SSDT 191(401) limitine sahip ve bizi beklemekte. Örneğin tablonun tamamını görmek için semboller yardımıyla şöyle bir şey yapabilirsiniz.

	kd> dps nt!KiServiceTable L poi(nt!KiServiceLimit)
	  82ab76f0  82ca80cb nt!NtAcceptConnectPort
	  82ab76f4  82b0122b nt!NtAccessCheck
	  82ab76f8  82c53e4e nt!NtAccessCheckAndAuditAlarm
	  ...
	  ...
	  ...

Tahmin edebileceğiniz gibi `nt!KiServiceLimit` bize tablonun limit değerini veriyor. Bu değeri `L` parametresi ile kullanıp, `dps` komutuna ne kadar uzunlukta bir veri çekeceğini belirtiyoruz. Aynı şekilde diğer SDT'yi de inceleyebilirsiniz. Örneğin diğer SDT'ye baktığınızda içinde 2 adet SST tanımlı olduğunu görebilirsiniz.

	kd> dps KeServiceDescriptorTableShadow l8
	  82bb0a00  82ab76f0 nt!KiServiceTable
	  82bb0a04  00000000
	  82bb0a08  00000191
	  82bb0a0c  82ab7d38 nt!KiArgumentTable
	  82bb0a10  82445000 win32k!W32pServiceTable
	  82bb0a14  00000000
	  82bb0a18  00000339
	  82bb0a1c  8244602c win32k!W32pArgumentTable

Fakat dahası konuyu uzatacağı için ayrıntıya girmiyorum. Öğrenmenin en iyi yollarından biri de dibini kurcalamaktır. Kısacası: kurcalayın.. Şimdi asıl konumuza dönelim.

## SSDT tablosu ve yazma koruması
SSDT kancalama yaparken karşınıza çıkacak sorunlardan biri tablonun bulunduğu alanın, yazmaya karşı korumalı olmasıdır. Kancalama yapmadan önce bu korumayı devre dışı bırakmamız gerekiyor. Özetlememiz gerekirse bunu yapabilmenin benim araştırken karşıma çıkan 3 yolu var:

* **CR0** yazmacının **WP** bitini değiştirmek<sup>[1](https://en.wikipedia.org/wiki/Control_register#CR0)</sup>
* `HKLM\SYSTEM\CurrentControlSet\Control\SessionManager\Memory\Management\EnforceWriteProtection` girdisini değiştirmek
* *MDL*(Memory Descriptor List) kullanmak<sup>[2](https://msdn.microsoft.com/en-us/library/windows/hardware/ff565421(v=vs.85).aspx)</sup>

Bu korumayı aşmaya geçmeden önce SSDT'nin bulunduğu adresin nasıl korunduğuna kısaca göz atalım. 

	kd> !pte nt!KiServiceTable
	                    VA 82ab86f0
	  PDE at C06020A8            PTE at C04155C0
	  contains 00000000001D1063  contains 0000000002AB8121
	  pfn 1d1       ---DA--KWEV  pfn 2ab8      -G--A--KREV

Gördüğünüz üzere PDE için izinlerimiz `---DA--KWEV`, PTE için izinlerimiz ise `-G--A--KREV` şeklinde. Önceki yazımızdan hatırlarsanız **PDE** yapısına `_MMPTE_HARDWARE` ile ulaşabiliyorduk. Ayrıca **PTE** yapısına da `_MMPTE_SOFTWARE` ile ulaşabilmekteyiz. Pekiyi bu izin değerleri ne anlama geliyor? Bazılarını özetlersek<sup>[3](http://blogs.msdn.com/b/ntdebugging/archive/2010/04/14/understanding-pte-part2-flags-and-large-pages.aspx)</sup>

* Valid (V): Verinin fiziksel hafızada olduğunu gösterir
* Read/Write (R/W): Verinin yazılabilir veya sadece okunabilir olduğunu gösterir
* User/Kernel (U/K): Sayfanın sahibinin user-mode mu, kernel-mode mu olduğunu gösterir
* CacheDisable (N): Sayfanın önbellekleme yapılıp yapılmayacağını gösterir
* Accessed (A): Sayfaya yazma/okuma yapıldığında tanımlanır
* Dirty (D): Sayfadaki verinin değiştiğini gösterir
* LargePool (L): Sadece PDE için geçerli, tanımlıysa sayfa boyutu 4MB, tanımsızsa 4KB (Önceki yazıya bakınız)
* Executable (E): Sayfadaki veri çalıştırılabilir

Şimdi dikkat ederseniz bizim PDE'miz yazılabilir PTE'miz ise read-only modunda. Ayrıca her ikisinin de çalıştırılabilir olduğunu görüyoruz. Yani tablomuzun yalnızca okuma izni olan bir yerde olduğunu görüyoruz. İşte bu korumayı geçebilmek için biraz önce bahsettiğimiz yollardan birini kullanmalıyız. Bu yazıda hem **MDL** yöntemini, hem de **CR0** yazmacı kullanarak bu korumayı geçmeyi gösterecem.

### CR0 yazmacı kullanarak korumayı kaldırma
Öncelikle **CR0** yazmacındaki **WP** bitinin hangi durumda nasıl bir etki yaptığını kısaca özetleyelim:

* 0: Çekirdek PDE ve PTE'deki R/W ve U/S bitlerinin ne olduğunu önemsemeden read-only alanlara yazmaya izin verir
* 1: Çekirdek read-only alanlara yazmaya izin vermez. Yazma kontrolünü PDE ve PTE'deki R/W ve U/S bitlerine bakarak kararlaştırır.

Örneğin benim sistemindeki **CR0** yazmacının durumunu görelim. Bunun için `.formats` komutunu kullanıyoruz bu sayede ikili formatta da çıktıyı görebiliriz.

	kd> .formats cr0
	Evaluate expression:
	  Hex:     80010031
	  Decimal: -2147418063
	  Octal:   20000200061
	  Binary:  10000000 00000001 00000000 00110001

Burada **16**. bit gördüğünüz gibi tanımlanmış(1) durumda. Yani koruma açık. Eğer **CR0** taktiğini kullanarak korumayı devre dışı bırakmak istiyorsak, bu yazmacın değerini değiştirip korumayı açık veya kapalı hale getiren iki adet küçük fonksiyonumuz var.

	void SetWP(){
		__asm{
			push eax
			mov eax, cr0
			or eax, NOT 0xFFFEFFFF // not fffeffff = 00010000
			mov cr0, eax
			pop eax
		}
	}

	void UnsetWP(){
		__asm{
			push eax
			mov eax, cr0
			and eax, 0xFFFEFFFF
			mov cr0, eax
			pop eax
		}
	}

Bu iki fonksiyondan `SetWP()` korumayı aktif etmek için kullanıyoruz. Öncelikle EAX'i stacke yedekleyip, ardından **CR0** yazmacının içeriğini EAX'e alıyoruz. Ardından bu değer üzerinde `or 00010000` işlemi uyguluyoruz ardından yeni değerimizi tekrar **CR0** yazmacına koyuyoruz. 00010000 ikili olarak `00000000 00000001 00000000 00000000`'e eşit. Yani **WP** bitini tanımlı hale getiriyoruz.(1)

İkinci fonksiyon olan `UnsetWP` ise korumayı kapatmak için. Önceki fonksiyonla oldukça benzer bir işlem yapıyor tek fark bu defa **CR0** yazmacının içeriğini `and FFFEFFFF` işlemine sokuyor. FFFEFFFF ikili olarak `11111111 11111110 11111111 11111111`'e eşit. Yani **WP** bitini tanımsız hale getiriyoruz.(0)

Eğer **MDL** kullanmayacaksanız, bu şekilde yazma korumasını kapatıp, map edilen SSDT ile değil de, direk orjinali üzerinde işlem yaparak kancalamayı gerçekleştirebilirsiniz. Ben bu yazıda **MDL** kullanacağım için(ki bu yöntemi kullanmak daha sağlıklı) **CR0** yöntemini uygulamalı olarak göstermeyeceğim. Fakat eğer bir kişi bile isteyen olursa, **CR0** kullanan sürücünün kaynak kodlarını da yayınlarım. Şimdi diğer yönteme geçelim..

### [MDL](https://msdn.microsoft.com/en-us/library/windows/hardware/ff565421(v=vs.85).aspx) kullanarak korumayı geçme
**MDL** kullanarak bir hafıza alanı tanımlayabiliyor, ayrıca hafıza alanının erişilebilirliğini de kendiniz belirleyebiliyorsunuz. Bu yazıda da bu özelliğin yardımıyla read-only olan tablomuza yazabiliyor olacağız. MDL hakkında daha detaylı bilgi almak isterseniz *Vir Gnarus*'un yazdığı [şu](http://www.sysnative.com/forums/bsod-kernel-dump-analysis-debugging-information/269-fun-mdls.html) makaleye ve [MSDN sayfasına](https://msdn.microsoft.com/en-us/library/windows/hardware/ff565421(v=vs.85).aspx)  bakabilirsiniz. Tabi ki ingıliçce.. Şimdi bizim programımızda kullandığımız `InitMDL()` fonksiyonunu görelim:

    //MDL kullanarak SSDT'yi "map" eden fonksiyon
	INT InitMDL(void)
	{
		MdlSSDT = IoAllocateMdl(KeServiceDescriptorTable.ServiceTableBase,
			                    KeServiceDescriptorTable.NumberOfServices * 4,
			                    FALSE,
			                    FALSE,
			                    NULL);

		if (MdlSSDT == NULL) {
			return STATUS_UNSUCCESSFUL;
		}

		MmBuildMdlForNonPagedPool(MdlSSDT);

		MdlSSDT->MdlFlags |= MDL_MAPPED_TO_SYSTEM_VA;

		MapSSDT = MmMapLockedPagesSpecifyCache(MdlSSDT,
			                                           KernelMode,
			                                           MmNonCached,
			                                           NULL,
			                                           FALSE,
			                                           HighPagePriority);

		if (MapSSDT == NULL) {
			return STATUS_UNSUCCESSFUL;
		}

		return STATUS_SUCCESS;
	}

Burada öncelikle `IoAllocateMdl` fonksiyonunu kullanarak ([MmCreateMdl](https://msdn.microsoft.com/en-us/library/windows/hardware/ff554500(v=vs.85).aspx) de kullanılabilir) **MDL** oluşturmak istediğimiz hafıza alanını tanımlıyoruz. MSDN'deki fonksiyon bilgilendirmelerine bakarak kullandığımız fonksiyonlar hakkında daha ayrıntılı bilgi sahibi olabilirsiniz. Misal, örneğin `IoAllocateMdl` fonksiyonuna bakalım:

	PMDL IoAllocateMdl(
	  _In_opt_    PVOID   VirtualAddress,
	  _In_        ULONG   Length,
	  _In_        BOOLEAN SecondaryBuffer,
	  _In_        BOOLEAN ChargeQuota,
	  _Inout_opt_ PIRP    Irp
	);

Fonksiyon bizim için bir **MDL** oluşturacak ve dönüş değeri olarak da oraya işaretçi döndürecek. Burada bizim için önemli olan ilk iki parametre. İlk parametremiz **MDL** tanımlaması yapılacak adresin başlangıcını veriyor. İkinci olan ise ne kadar uzunlukta olduğunu. Biz fonksiyona tablomuza uygun biçimde başlangıç adresini ve uzunluğu verdik.(Tablonun tanımlandığı kısma geleceğiz) Ardından işlemin tamamlanıp/tamamlanmadığını kontrol ediyoruz. Daha sonra `MmBuildMdlForNonPagedPool` fonksiyonunu kullanarak belirlediğimiz alanı tanımlaması için **MDL**'mizi güncelliyoruz. Bu işlemin ardından **MDL**'mizin izinlerini de güncelleyerek sürücümüz içinden erişilip değiştirilebilir şekilde ayarlıyoruz. Son olarak `MmMapLockedPagesSpecifyCache` fonksiyonunu kullanarak **MDL** tarafından tanımlanan sayfaları sanal adrese atıyoruz. Bu fonksiyonun return değerini de saklıyoruz çünkü işte bu değer bizim tablomuza ulaşmamızı sağlayacak olan adresin ta kendisi olacak.. Bu dönüş değerini aşağıda sürücümüzü yükledikten sonra test edeceğiz.

## Kancalamanın test edilmesi için hazırlık
Kancalama işlemine geçmeden önce ortamımızı hazırlamamız gerekiyor. Dönen olayları görmek için kernel debugging yapacağımızdan işletim sistemimizi de buna göre ayarlamamız gerekiyor. Ben kernel debugging yaparken işlemi hızlandırmak için [VirtualKD](http://virtualkd.sysprogs.org/) kullanıyorum. Kendisini indirdikten sonra içerisindeki **target** klasöründen `vminstall.exe`'yi sanal makinemizde çalıştırarak işletim sisteminin debug için gereken ayarlarını otomatik yaptırıyoruz. Ardından kendi makinemizde `vmmon.exe`'yi çalıştırarak programın sanal makineleri izlemesini sağlıyoruz. Çalıştırdığımızda bizi şu şekilde bir görüntü karşılayacak:

![](/files/virtualkd.jpg)

İşletim sistemini açarken karşımıza çıkan *VirtualKD* seçeneğini seçtikten sonra eğer debugger yolunuz da doğru ayarlandıysa program otomatik olarak debuggerı başlatacaktır.

![](/files/virtualkdboot.jpg)

Debugger işletim sistemine bağlandıktan sonra aşağıdakine benzer bir görüntü ile karşılaşacaksınız. Artık `g` komutu ile sistemin açılışını devam ettirebiliriz demektir.

![](/files/virtualkdattached.jpg)

Artık `0x80000000 - 0xFFFFFFFF` adres aralığındaki işlemleri de kontrol edebilir durumdayız. User-mode bir debugger kullandığınızda bu adreslere erişim izniniz yoktur, fakat artık bir kernel nincalığı peşindeyiz. Yani bu da demektir ki artık sistemin tamamına erişebilir durumdayız.

## Kancalama sürücüsünün yazılması
Şimdi sıra geldi asıl işi yapacak olan kodları yazmaya. Kodların yazılmasını geçtim, derlenmesi kısmına bu yazıda hiç girmeyecem lakin içtenlikle söylüyorum ki kodları derlemek benim için yapıyı anlayıp, kod yazmaktan daha zor. Neden bilmiyorum ama bu derleme işini bir türlü beceremiyorum. Zaten Visual Studio 2015 kurduğum için ortalık biraz karıştı, zar zor ayarlayabildim ehehe. <del>Kodların yorum içeren halini şuradan indirebilirsiniz</del>(Kodların kötüye kullanımını engellemek amacıyla kaynak kodları kaldırdım, görmek isteyenler lütfen mail ile ulaşşsınlar.). Hadi başlayalım o zaman!

Öncelikle programımızın ana dosyası olan `bekkitcik.c` dosyasının içeriğini görelim:

	#include "bekkitcik.h"

	//Gerçek fonksiyonun yerine çalışacak olan kanca fonksiyon
	NTSTATUS HookNtLoadDriver(PUNICODE_STRING DriverName)
	{
		//Fonksiyonu çağıran process ID'sini ve yüklenecek sürücünün adını kendimize bildiriyoruz
		DbgPrint("NtLoadDriver cagirildi, process: %d. Driver ismi: %ws \n", PsGetCurrentProcessId(),
			                                                                 DriverName->Buffer);
		//Asıl fonksiyonu çalıştırıyoruz
		return RealNtLoadDriver(DriverName);
	}

	//Sürücünün silinmesi sırasında çalışacak olan fonksiyon
	void Unload(PDRIVER_OBJECT pDriverObject)
	{
		//Sürücü yüklendiğinde yapılan kancayı kaldırıyoruz
		SetHook((ULONG)ZwLoadDriver, (ULONG)RealNtLoadDriver);
	    
	    //MDL'imizi siliyoruz
		if (MdlSSDT != NULL)
		{
			MmUnmapLockedPages(MapSSDT, MdlSSDT);
			IoFreeMdl(MdlSSDT);
		}

		DbgPrint("NtLoadDriver kancasi kaldirildi. \n");
	}

	//Sürücü yüklendiğinde çalışacak olan fonksiyon
	NTSTATUS DriverEntry(PDRIVER_OBJECT pDriverObject, PUNICODE_STRING pRegistryPath)
	{
		//Sürücü silindiğinde çalışacak fonksiyonu tanımlıyoruz
		pDriverObject->DriverUnload = Unload;
	    
	    //Gerçek LoadDriver fonksiyonun adresini yedekliyoruz
		RealNtLoadDriver = (ZWLoadDriver)GetFuncAddress((ULONG)ZwLoadDriver);
	    
	    //MDL kullanarak SSDT'ye yazabilmek için SSDT'yi "map" ediyoruz
		if (!InitMDL())
		{
			//SSDT'deki gerçek fonksiyonun adresini bizim kanca fonksiyonumuz ile değiştiriyoruz
			SetHook((ULONG)ZwLoadDriver, (ULONG)HookNtLoadDriver);
		}

		DbgPrint("RealNtLoadDriver adresi: %#x \n", RealNtLoadDriver);
		DbgPrint("HookNtLoadDriver adresi: %#x \n", HookNtLoadDriver);
		DbgPrint("NtLoadDriver kancalandi. \n");

		return STATUS_SUCCESS;
	}

Programın ana dosyası oldukça anlaşılır ve kolay. Eğer daha önceden de Windows sürücüleri geliştirmeye aşina iseniz hemen anlayacaksınızdır. Fakat ilk defa karşı karşıyaysanız o zaman biraz kafanız karışabilir bu nedenle çok kısaca sürücülerden bahsedelim. 

Sürücüler yapı olarak normal bir programla aynıdır. Her ikisi de bildiğimiz çalıştırılabilir dosya(EXE) formatındadır. Önemli olan fark ise sürücülerin kernel modunda dolaşıyor olması, yani kullanıcı modunda(user-mode) çalışan programlardan daha üst yetkiye sahip olmasıdır. Örneğin bir sürücü içerisinden donanımla erişime geçebilir, kullanıcıların ulaşamadığı hafıza bölgelerine erişebilirsiniz (yukarıdaki gibi yöntemler kullanarak).. Pekiyi sürücüler nasıl çalışmaya başlıyorlar? Bu konu sürücüleri normal programdan ayıran önemli bir noktadır. Örneğin *C* ile bir uygulama yazdığınızda programın genel itibariyle `main` fonksiyonu ile başlayacağını biliyorsunuz veya bir **DLL** ise `DllEntry` ile başlayacaktır.. Sürücüler ise `DriverEntry`<sup>[4](https://msdn.microsoft.com/en-us/library/windows/hardware/ff544113(v=vs.85).aspx)</sup> fonksiyonundan çalışmaya başlıyorlar. Bu fonksiyon `DriverObject` ve `RegistryPath` isimli iki parametre alıyor. İlki sürücümüzün **DRIVER_OBJECT**<sup>[5](https://msdn.microsoft.com/en-us/library/windows/hardware/ff544174(v=vs.85).aspx)</sup> yapısına bir gösterici, diğeri ise sürücümüzün kayıt defteri girdisini gösteriyor..

Pekiyi sürücülerin çalışması dururken ne oluyor? Bu defa da bizim sürücümüzde `Unload` isimli fonksiyon çalışıyor. İsminin ne olduğu size kalmış, yani illa Unload olmak zorunda değil. `DriverEntry` fonksiyonunda **DriverObject** yapısının **DriverUnload** alanına bu fonksiyonu tanımladığınız sürece sıkıntı yok.. Mesela bu fonksiyonda girişte ne yaptıysanız onu tersine çeviriyorsunuz gibi düşünebilirsiniz. Örneğin ben bu fonksiyonda sürücüm yüklendiğinde kancaladığım fonksiyonu eski haline döndürüp, tanımladığım **MDL**'yi siliyorum.. Bunu yaparken öncelikle `MmUnmapLockedPages` fonksiyonunu kullanıp ilk parametre olarak map edilen adresi, ikinci parametre olarak ise **MDL**'imizi vererek maplediğimiz alanı serbest bırakıyoruz. Ardından `IoFreeMdl` fonksiyonunu kullanarak önceden tanımladığımız **MDL**'yi de serbest bırakıyoruz, yani siliyoruz.

Şimdi programımızın nasıl çalıştığına gelelim.. `DriverEntry` fonksiyonumuzda gördüğünüz gibi öncelikle kancalayacağımız fonksiyon olan `NtLoadDriver`'ın gerçek adresini yedekliyoruz. Bunu yapmamızın nedeni, bizim kanca fonksiyonumuzu çağırdıktan sonra onun içinden gerçek fonksiyonu da çağıracak olmamız. Ayrıca kancayı kaldırırken bu adresi tekrar yerine koyacağımız için saklamamız gerekiyor..(Aslında başka bir fonksiyonu kancalayacaktık, fakat eğer onu kancalarsak yazı çok uzayacak, işin içine çok fazla yapı girecek; o yüzden burada bırakıyoruz) Burada kullandığımız `GetFuncAddress` fonksiyonu ve onun kullandığı `GetServiceNumber` makrosu şöyle:

	//Indexi veren makro
	#define GetServiceNumber(ZWFunction)(*(PULONG)((PUCHAR)ZWFunction + 1)); 
    
	//SSDT'den fonksiyon adresi alan fonksiyon
	ULONG GetFuncAddress(ULONG Function)
	{
		//Önce fonksiyonun index değerini buluyoruz
		ULONG FuncIndex = GetServiceNumber(Function);
		//Ardından SSDT'den bu indexteki fonksiyon adresini döndürüyoruz
		return *(PULONG)((ULONG)KeServiceDescriptorTable.ServiceTableBase + FuncIndex * 4);
	}

Burada `GetServiceNumber` makrosunun da yardımıyla kancalayacağımız fonksiyonun index değerini bulup, ardından **SSDT** tablomuzda bulunan fonksiyonun adresini geri döndürüyoruz. Şuna dikkat etmemiz gerekiyor, `GetServiceNumber` makrosu her zaman **Zw** önekli fonksiyon ismini alıyor. Bunun nedeni Zw önekli fonksiyonların başlangıçlarında `mov eax, xxx` şeklinde bir parça olması, bu güzel bilgi sayesinde fonksiyonun index değerini bulabiliyoruz. Örneğin `ZwLoadDriver`'a bakalım:

	kd> u ZwLoadDriver L1
	nt!ZwLoadDriver:
	    82a965b0 b89b000000    mov     eax,9Bh

İşte bizim makromuz buradaki değerden 1 byteı(mov komutunu) atarak, geri kalan değeri *unsigned long*'a çevirip bize index değerini veriyor, yani **9B**'yi. Ardından da bu index değeri sayesinde **SSDT** tablomuzdaki fonksiyonun adresini buluyoruz.

Gerçek fonksiyonu yedekledikten sonra `InitMDL()` fonksiyonumuz **MDL** için gereken işlemleri gerçekleştiriyor. Bu fonksiyonun ne yaptığını zaten **MDL** bölümünde açıklamıştım o nedenle geçiyorum. Ardından ise kilit nokta olan, kancalamayı yapan fonksiyonumuz geliyor. Şimdi onu inceleyelim:
	
	//Kancalama işlemini yapan fonksiyon
	ULONG SetHook(ULONG SysFunc, ULONG NewFunc)
	{
		//Önce değiştirilecek fonksiyon göstericisinin yerini buluyoruz
		PULONG SysAddr = (PULONG)(MapSSDT) + GetServiceNumber(SysFunc);
		//InterlockedExchange ile fonksiyon adresini kanca fonksiyon ile değiştiriyoruz
		return InterlockedExchange((PLONG)SysAddr, (ULONG)NewFunc);
	}
    
    //SSDT'deki gerçek fonksiyonun adresini bizim kanca fonksiyonumuz ile değiştiriyoruz
	SetHook((ULONG)ZwLoadDriver, (ULONG)HookNtLoadDriver);

Fonksiyonumuz iki parametre alıyor ilki değiştireceğimiz fonksiyon, diğeri ise onun yerine geçecek olan kanca fonksiyon. Burada gördüğünüz gibi *ZwLoadDriver*'ın yerine bizim kanca fonksiyonumuz olan *HookNtLoadDriver* geçiyor. **SetHook** fonksiyonuna bakarsak burada iki satırlık basit bir kod görüyoruz. İlk satırın yaptığı şey **MDL** kullanarak elde ettiğimiz adreste değiştirilecek alanı bulmak. İkinci satırda ise yeni bir fonksiyon gözümüze çarpıyor. **InterlockedExchange**<sup>[6](https://msdn.microsoft.com/en-us/library/windows/desktop/ms683590(v=vs.85).aspx)</sup> fonksiyonu. Bu fonksiyon 32 bitlik bir değişkeni belirlediğimiz değere *atomic* olarak tanımlamaya yarıyor. Pekiyi bu *atomic* olayı nedir? *Atomic* işlemler tek seferde, kesmeye uğramadan çalışan işlemlere deniyor. Yani bu fonksiyonu kullandığınızda 32 bitlik değer diğer işlemciler tarafında kesilmeye uğramadan belirlenen yere yazılıyor. Genelde *InterlockedXXX* şeklinde tanımlı fonksiyonlar bu şekilde çalışır. Bu fonksiyonlarda `lock` makine komutu kullanılır, bu komut kendinden sonra çalışacak olan makine kodunu çalışırken diğer işlemcileri bekletmektedir. Bu sayede örneğin dword'luk değer yazmak isterken diğer işlemci tarafında kesintiye uğrayıp wordluk değer yazmaktan sakınmış oluyoruz. Bu ihtimalin gerçekleşmesi ciddi sorunlara(BSOD(Ünlü mavi ekran) gibi) yol açabilir, o nedenle önlemimizi almak zorundayız.. Bu fonksiyonun nasıl kullanıldığına gelirsek prototipi şöyle:

	LONG __cdecl InterlockedExchange(
		LONG volatile *Target,
	    LONG           Value
	);

İsimlerinden de anlaşılacağı üzere ilk parametre değiştirilecek veriye işaretçi, ikincisi ise ilk parametrenin gösterdiği yere yazılacak olan verimiz. Buradaki kullanıma bakarsanız fonksiyona ilk verdiğimiz değer **SysAddr** yani kancalanacak fonksiyonun adresi, ikincisi ise bu adrese yazılacak olan yeni fonksiyonumuzun adresi.. Böylece tabloda asıl fonksiyonun adresini bizim adresimizle değiştirmiş oluyoruz.

Bir diğer fonksiyonumuz ise kancalama için kullandığımız `HookNtLoadDriver` fonksiyonu. Bu fonksiyon artık **NtLoadDriver** her çağırıldığında çağırılacak olan fonksiyonumuz. Yani aslında yeni `NtLoadDriver` fonksiyonumuz. Kendi yapacağını yaptıktan sonra ise işi tekrardan gerçek fonksiyona devrediyor. Karışık bir konu olmaması açısından tek yaptığımız şey fonksiyonu çağıran process'in ID'sini ve fonksiyona verilen **DriverName** yapısının **Buffer** elemanını, yani yüklenecek sürücünün yol bilgisini ekranına yazdırmak.

Son olarak fonksiyonun sonlarında `DbgPrint`<sup>[7](https://msdn.microsoft.com/en-us/library/windows/hardware/ff543632(v=vs.85).aspx)</sup> fonksiyonunu kullanarak faydalı olabilecek debug bilgilerini de yazdırıyoruz. `DbgPrint` kullanılarak oluşturulan çıktıları Windbg ekranında yahut DebugView<sup>[8](https://technet.microsoft.com/en-us/library/bb896647.aspx)</sup> yardımı ile görebilirsiniz..

Ana dosyamızla ilgili açıklamaları yaptığımıza göre sıra `bekkitcik.h` başlık dosyasının içerisindekilere geldi. Dosyamızın en başındaki tanımlamalara bakarsak:

	#include <ntddk.h>

    //MDL için kullandığımız değişkenler
	PMDL   MdlSSDT = NULL;
	PVOID  MapSSDT = NULL;

	//Kancalanacak fonksiyonun prototipini tanımlıyoruz
	NTKERNELAPI NTSTATUS ZwLoadDriver(PUNICODE_STRING DriverServiceName);

	//Fonksiyonun gerçek adresini tutacak olan değişkeni tanımlıyoruz
	typedef NTSTATUS(*ZWLoadDriver)(PUNICODE_STRING);
	ZWLoadDriver RealNtLoadDriver;

Öncelikle tüm sürücülerde olması gereken birçok yapı ve sabiti tanımlayan **ntddk.h** dosyasını programımıza dahil ediyoruz. Ardından gelen iki değişken MDL için kullandığımız değişkenlerimiz. Sonrasında kancalayacağımız fonksiyonun prototipini ve gerçek fonksiyonumuzun adresini saklayacak değişkeni, kancalayacağımız fonksiyonun prototipine göre tanımlıyoruz.

Bu tanımlamaların ardından SST'ye ilişkin tanımlamalarımız geliyor. Kernel çekirdeğinde herhangi bir şey ihraç(export) edildiği zaman `__declspec(dllimport)` bildirimini kullanarak bu ihraç edilen sembolü kullanabiliyoruz. *dllimport* kullanarak derleyiciye diyoruz ki: "*kaarşim, bu kullandığım arkadaş kernel tarafından ihraç edildi ben bunu kullanırken ne olduğunu anlamayıp programda bir hata meydana geldi sanma, taam mı?*". Derleme işlemi bittikten sonra bizim kullandığımız ihraç edilen sembol, linkleme işlemi sırasında gerçek adres ile otomatik olarak değiştirilecek, böylece sorunsuz kullanılabilecek.

Şimdi.. `KeServiceDescriptorTable` sembolünü kullanmak için programımıza şu satırları da ekliyoruz:

	//SST yapısı
	typedef struct _SYSTEM_SERVICE_TABLE {
		PULONG ServiceTableBase;        //SSDT adresi, fonksiyon adresleri bu adreste başlıyor
		PULONG ServiceCounterTableBase; //Kullanılmıyor
		ULONG  NumberOfServices;        //Toplam servis sayısı, tablo limiti
		PUCHAR ParamTableBase;          //System Service Parameter Table
	} SST;

	//ntoskrnl.exe'den ihraç edilen, SSDT'yi gösteren gösterici 
	__declspec(dllimport) SST KeServiceDescriptorTable;

Sanırım buraya ilişkin bir açıklama yapmamıza gerek yok değil mi? Tablo yapımızı tanımlayıp arından kernel'ın ihraç ettiği sembolü bu yapıyla tanımlıyoruz. `bekkitcik.h` içerisindeki fonksiyonları da hemen hemen tamamen anlattığımıza göre şimdi test aşamasına geçebiliriz.

## Sürücünün test edilmesi
Her şey hazırsa artık sürücümüzü derleyip, ardından sistemde çalıştırabiliriz. Derleme işlemini yaptıktan sonra oluşacak olan .sys uzantılı dosyamızı sanal makinemize atıp, ardından internette bulabileceğiniz bir driver loader kullanarak (örneğin [bunu](https://www.osronline.com/article.cfm?article=157)) sürücümüzü yükleyip çalıştırmak. Aşağıda hem sürücüyü ilk yüklediğimde hem de sistemde başka bir sürücü yüklendiğinde kancamız sayesinde oluşan mesajları görüyorsunuz.

![](/files/debugview.jpg)
![](/files/debugview2.jpg)

Son olarak daha önceden hazırladığımız test ortamında Windbg ile SST tablomuzun **9B** indexine bakarsak fonksiyonun kancalandığını göreceğiz.

	kd> dds nt!KiServiceTable + 4*9B L1
	  82aa895c  962ca074 bekkitcik!HookNtLoadDriver

Burdan sonra dilerseniz `bp bekkitcik!HookNtLoadDriver` yaparak bu fonksiyona breakpoint koyup, ardından başka bir sürücü yüklemesi yaparak bu breakpointi tetikleyebilir, ve fonksiyonun işleyişini gözlemleyebilirsiniz.

Şimdi son olarak dilerseniz debugger'da `MapSSDT`de bulunan veriye bakabiliriz. Bunun için Windbg'de `bekkitcik` isimli modülümüzün *data* kısmında tanımlanan değişkenlere bakmalıyız. Bu işlem için de `x` komutunu `/d` parametresi ile kullanabiliriz.

	kd> x /d bekkitcik!*
	  9ce9a008          bekkitcik!RealNtLoadDriver = 0x82bbb279
	  ...
	  9ce9a004          bekkitcik!MapSSDT = 0x805fc6f0
	  9ce9a000          bekkitcik!MdlSSDT = 0x84321450
	  ...

Burada gördüğünüz gibi **MapSSDT** `0x805fc6f0` adresinde, **MdlSSDT** ise `0x84321450` adresinde. **MDL** yapısını `dt nt!_MDL` ile görebilmekteyiz. Örneğin bizim **MDL** adresimizdeki yapıya bakalım:

	kd> dt nt!_MDL 0x84321450
	   +0x000 Next             : (null) 
	   +0x004 Size             : 0n32
	   +0x006 MdlFlags         : 0n13
	   +0x008 Process          : (null) 
	   +0x00c MappedSystemVa   : 0x805fc6f0 Void
	   +0x010 StartVa          : 0x82a89000 Void
	   +0x014 ByteCount        : 0x644
	   +0x018 ByteOffset       : 0x6f0

Yapıda kodlarımızda üzerinde değişiklik yaptığımız, izinlerin durumunu belirten `MdlFlags` alanını da görüyorsunuz. Ayrıca `Next` alanı da ilgi çekici, demek ki MDL'ler birbirine bağlı.. Şimdilik bizi ilgilendiren kısım `MappedSystemVa` kısmı. Dikkat ederseniz bu değer `MapSSDT`'nin değeri ile aynı. `dps` kullanarak bu adresteki veriyi çekersek SSDT'nin map edilmiş halini göreceğinz.

	kd> dps poi(bekkitcik!MapSSDT)
	  805fc6f0  82c7a0cb nt!NtAcceptConnectPort
	  805fc6f4  82ad322b nt!NtAccessCheck
	  805fc6f8  82c25e4e nt!NtAccessCheckAndAuditAlarm
	  805fc6fc  82a3e6e1 nt!NtAccessCheckByType
	  805fc700  82c9ae6e nt!NtAccessCheckByTypeAndAuditAlarm
	  805fc704  82b1748a nt!NtAccessCheckByTypeResultList

Gördüğünüz gibi map edilen SSDT karşımızda.. Son olarak `pte` komutu ile map edilen SSDT'nin ve orjinal SSDT'nin izinlerine bakalım:

	kd> !pte nt!KiServiceTable
	                    VA 82a896f0
	  PDE at C06020A8            PTE at C0415448
	  contains 00000000001D1063  contains 0000000002A89121
	  pfn 1d1       ---DA--KWEV  pfn 2a89      -G--A--KREV

	kd> !pte poi(bekkitcik!MapSSDT)
	                    VA 805fc6f0
	  PDE at C0602010            PTE at C0402FE0
	  contains 000000003D041863  contains 0000000002A89963
	  pfn 3d041     ---DA--KWEV  pfn 2a89      -G-DA--KWEV

Dikkat ederseniz gerçek SSDT'nin **PTE** girdisi **read-only** modunda. Fakat "map" edilen SSDT'nin **PTE** girdisi *W* bitine sahip, yani **yazılabilir** durumda.

SSDT kancalama ile ilgili yazının sonuna geldik. Umarım bir şeyler katabilmiştir. Yazıda ve verilen bilgilerde elbette ki yanlışlıklar olabilir. Fark edenler lütfen yorumlarda yahut e-mail üzerinden geri bildirim yapabilirse ben de düzeltmiş olurum.

Sevgiler

---
* [unknowncheats](http://www.unknowncheats.me/forum/c-and-c/59147-writing-drivers-perform-kernel-level-ssdt-hooking.html)
* Windows Internals 6
* [MDL üzerine güzel bir OSR makalesi](http://www.osronline.com/article.cfm?id=423)
* [Using MDLs](https://msdn.microsoft.com/en-us/library/windows/hardware/ff565421(v=vs.85).aspx)
* [Yazarken dinlediğim](https://www.youtube.com/watch?v=azpAnpM6VZo)
