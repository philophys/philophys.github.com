---
title: Sednit Çekirdek Modülü Analizi
categories: Bilgisayar
---

Selamlar.

Bu yazıda 2004den beri aktif olan Sednit grubu (ve ayrıca APT28, Fancy Bear) diye bilinen siber casusluk çetesinin(:ğ) kullandığı çekirdek modüllerinden birinin kısa bir incelemesini bulabilirsiniz. Bu modül esasen bir indirici olan "*Downdelph*"i koruyan ve işleyişine yardımcı olan bir çekirdek modülü. "*Downdelph*" Delphi diliyle yazılmış bir indirici. Yani, bu arkadaş kontrol sunucusuyla iletişimde olan, kontrol sunucusundan gelen görevleri işleyen, bizim bilgisayarımızla ilgili bilgileri kontrol sunucusuna ileten bir zararlı bileşen. Aslında bu indiriciyi de analiz etmek istemiştim fakat bir yerden sonra pek mümkün gözükmüyor, nedenini ilerleyen kısımlarda göreceksiniz. Hem bundan dolayı hem de çekirdek sürücüsünün çekirdekteki basit ama etkili birkaç mekanizmayı göstermesinden dolayı daha çok çekirdek sürücüsüne odaklı bir yazı olacak. Çekirdek sürücüsünün sistemde kalıcılığı sağlamak için kullandığı üç yöntem var benim bildiğim. Bir tanesinde bir "*bootkit*" kullanıyor, birinde "*rootkit*", diğerinde ise başlangıçta otomatik olarak çalışacak olan bir kayıt girdisi.

Bunlardan ilkinde sistemde kalıcılığı bir "*bootkit*" kullanarak gerçekleştiyor. "*Bootkit*" dediğimiz şey ise işletim sistemi henüz işi devralmadan hemen önce çalışan kodların değiştirilmesi ile kontrolün ele geçirilmesine olanak tanıyan bir zararlı türü. Son birkaç senedir çok gözde olmaya başladılar. Bunun çeşitli nedenleri var örneğin bir tanesi işletim sistemindeki dijital imza kontrolü. Peki bu nedir? Şudur ki işletim sistemi çekirdek modunda yüklenecek sürücülerin dijita ilmzalı olmasını istiyor. Zararlı yazılım geliştiricileri için tabi çok iyi bir şey değil bu (gerçi gidip imza alan bile var hehehe), bu önlemi de atlatmak için çeşitli yöntemler bulunuyor diğer birçok önlemde olduğu gibi. Bunlardan biri de "*bootkit*"lerin yardımı. Tabi başka yollar da var, misal *VirtualBox*'un birkaç sürüm öncesindeki çekirdek modülünde bir zafiyet vardı. O sürücüyü hala saklıyorsanız (hehehe) yine korumayı atlatabilirsiniz, vesaire gibi gibi. Bununla ilgili bir inceleme de yazıcam inşallah.

Şimdi asıl bu yazıda göstermek istediğim kısma geçmeye başlayalım. Zararlının çekirdek modülü karmaşık değil, ama öğretici. Bu nedenle böyle giriş yazısı gibisinden hoş olur diye düşünüyorum. Özetlemem gerekirse bu sürücü zararlının sistemde görünmesini istemediği bazı şeylerin gizlenmesinden, kontrol sunucusuyla iletişime geçecek olan bileşenin kullanıcı moduna sızdırılmasından sorumlu. Bunun için de işletim sisteminin sunduğu çeşitli yöntemleri kullanıyor.

Aracı yazılım ise *UAC* korumasını atlatmaktan, sürücüyü ve indiriciyi yüklemekten ve sürücünün kullanacağı parametreleri ayarlamaktan sorumlu. Genelde böyle aracı yazılımların kaynaklar kısmında diğer bileşenleri saklarlar sonra bu aracı yazılım çalışınca bileşenler kaynaklardan alınır ve yapılacak olan yapılır, bunda ise kaynaklara koymamışlar da aracı yazılımın bittiği yere koymuşlar, bilinen bir yöntem (*PE Overlay*)... Aracının içerisinde iki adet dosya var, bunlardan biri çekirdek sürücüsü olan `FsFlt.sys`, diğeri ise kontrol sunucusuyla iletişimde olan indiricimiz (yani *Downdelph*) `dnscli1.dll`. Herhangi bir şifreleme falan kullanılmamış. Zaten sürücüsü de sanki henüz geliştirilme sürecinde olan bir zararlı yazılım izlenimi veriyor.

![](/files/sednit-gizlenen.png)

Genelde statik analizden önce dinamik bir analiz nereye bakmamız gerektiği konusunda çok güzel fikir verebilir, hatta çoğu zaman yapmak istediğiniz şeye de bağlı olarak sorunu da çözebilir. O nedenle şimdi dinamik tarafından bakalım hemen. Zararlı bir yazılım olduğunuzu düşünün, neylerle uğraşırsınız? Muhtemelen dışarıya bilgi vereceksiniz değil mi? O halde internet ile ilgili şeylere bakmakta fayda var. Başkaa... Bir yerlerde bir dosyanız bi kütüphaneniz falan olmalı değil mi? O halde diskte oluşturulan, yazılan dosyalara da bakmak iyi bir fikir. Başka?? Mesela kayıt defterinde bir şeyler gizleme ihtimaliniz var veya sürücünüz varsa kayıt defteri ile ilginiz olabilir değil mi? O halde hemen buraların bi kontrolünü yapalım.

Örneğin, zararlı çalıştıktan sonra dosya oluşturmuş mu ne yapmış diye baktığımızda söyle bir sonuç çıkıyor:

![](/files/sednit-olusturduklari.png)

Buradan anladığımız kadarıyla `System32` klasörü altında `mypathcom` isimli bir dizin ve ardından bu dizinin içerisinde `dnscli1.dll`, yani *DownDelph*'i oluşturulmuş. Bir sonrakine baktığımızda ise çoğu sürücünün bulunduğu dizin olan `C:/Windows/System32/drivers` içerisinde `FsFlt.sys` isimli bir sürücü dosyasının oluşturulduğunu görüyoruz. Bundan başka kayıt defterinde olanlara bakarsak mesela:

![](/files/sednit-kayitdefteri.png)

Büyük bir ihtimalle sürücünün kullanacağı parametrelerinin ayarlandığı izlenimini veriyor. Bu işlemler gerçekleştikten kısa bir süre sonra zaten aracının içerisinden çıkartılmış ve sisteme yüklenmiş olan sürücü çalışmaya başlıyor. *DbgView* çıktısına baktığımızda şöyle ilginç bir şey görüyoruz:

![](/files/sednit-kurallar.png)

İlginç diyorum çünkü zararlı yazılımda böyle mesajlar yazdırmak falan pek mantıklı değil... TDL sürümünde benzer şeyler vardı ama onlar daha zekice ve kodu analiz edenlerle dalga geçmek için yapılmış (bence) hoş şeylerdi. Birkaç ihtimalden ikisi ya yazan kişiler henüz geliştirme aşamasındalar, ya da Rus dostlarımız votkayı fazla kaçırmış hehehe. Kuvvetle muhtemelen sürücümüz bu bilgileri biraz önce gördüğümüz kayıt defterinden aldı. Şimdi de bunlara göre bir şeyler yapacak. Çıktıdan anladığımız kadarıyla gizlenecek dosyalar ve bir dizin var. Bir de bir yerlere(?) enjeksiyonu yapılacak bir **DLL** dosyası mevcut, ki kendisi zaten indiricimiz.

Sistemdeki bağlantılara baktığımızda **explorer** işleminde bir garip bağlantı görüyoruz:

![](/files/sednit-baglanti.png)

Şimdiye kadar gördüklerimizi birleştirirsek **explorer** içerisinde birtakım olayların döndüğü belli. Bakalım şüphelerimiz doğru mu? **Explorer** işleminin bağlam alanında olan modül listesine bakıyoruz, bakalım burada şüpheli bir modül var mı:

![](/files/sednit-explorer-girmis.png) 								

Evet, işte burada. Aracının içerisinden çıkarttığı **DLL** dosyası, **explorer* işlemine enjekte edilmiş. Gördüğünüz gibi sadece dinamik analiz ile kritik olan tüm bilgilere ulaştık. Artık bu aşamaya ulaşıldığında yapılacak tek şey kontrol sunucularının engellenip sistemde bulunan zararlı yazılım bileşenlerinin kaldırılması olacak. Bu arada bu modül içerisinde biraz gezinince şunu görüyoruz:

![](/files/sednit-ccbulduk.png)

Büyük bir ihtimal kontrol sunucusu `intelmeserver.com` adresiymiş. Fakat girmeye çalışırsanız göreceksiniz ki *Kaspersky* bu adresi almış. Bu nedenle indiricinin paket analizini yapma imkanım sanırım yok. E tabi statik analiz ile yine bir şeyler çıkabilir fakat bu yazının konusu değil. 

### Çekirdek modu sürücüsü analizi

Ne için baktığımızı biliyoruz : `FsFlt.sys`. Zararlı yazılım bulaşmış bilgisayara *Windbg* bağlayıp sürücüye bir göz atalım.

    1: kd> !lmi fsflt
    Loaded Module Info: [fsflt] 
             Module: FsFlt
       Base Address: 984c2000
         Image Name: FsFlt.sys
       Machine Type: 332 (I386)
         Time Stamp: 53071d9d Fri Feb 21 02:34:21 2014
               Size: c000
           CheckSum: 14fc0
    Characteristics: 102  
    Debug Data Dirs: Type  Size     VA  Pointer
                 CODEVIEW    45,  8200,    6800 RSDS - GUID: {7597011A-7C96-423D-87BA-5BE3731AD625}
                   Age: 1, Pdb: d:\!work\etc\hi\Bin\Debug\win7\x86\fsflt.pdb

Burada benim dikkatimi çeken tarih kısmı ve bir de sembol dosyasının isminin açıkta olması: `d:\!work\etc\hi\Bin\Debug\win7\x86\fsflt.pdb`. Zamanında bir çinli zararlı yazılım geliştiricisi bu sembol dosyasının isminden tespit edilmişti, hem de evine kadar...

Şimdi sürücünün neler yaptığını IDA + Windbg ikilisini kullanarak inceleyelim. Bunun için sürücünün başlangıç fonksiyonuna durma noktası belirleyip işletim sistemini tekrar başlatmamız gerekiyor. Yani aslında gerekmiyor tabi, ama ben incelemeyi yaparken kodu okutuktan sonra istediğim yere kadar çalıştıracağım için bu şekilde yapacağım. Bunun için öncelikle bu sürücü hafızaya yüklendiğinde (çalıştırıldığında değil) `sx` komutu ile hata ayıklayıcısının durmasını sağlayacağız. Ardından yüklendiği adresi ve kodun başlangıç noktasını bulup oraya bir durma noktası koyacağız. Sonra ikili şekilde analize devam edebiliriz hızlıca.

    Windows 7 Kernel Version 7600 MP (1 procs) Free x86 compatible
    Built by: 7600.16385.x86fre.win7_rtm.090713-1255
    Machine Name:
    Kernel base = 0x8281e000 PsLoadedModuleList = 0x82966810
    System Uptime: not available
    nt!DbgLoadImageSymbols+0x47:
    82836fa6 cc              int     3
    kd> sxe ld:FsFlt.sys
    kd> g
      nt!DbgLoadImageSymbols+0x47:
      82836fa6 cc              int     3
    0: kd> lmm *fsf*
      Browse full module list
      start    end        module name           
      8949f000 894ab000   FsFlt      (deferred) 
    0: kd> !dh -f 8949f000
      File Type: EXECUTABLE IMAGE

      FILE HEADER VALUES
         14C machine (i386)
           5 number of sections
      53071D9D time date stamp Fri Feb 21 02:34:21 2014
           0 file pointer to symbol table
           0 number of symbols
          E0 size of optional header
         102 characteristics
                Executable
                32 bit word machine

    OPTIONAL HEADER VALUES
         10B magic #
        9.00 linker version
        6A00 size of code
         E00 size of initialized data
           0 size of uninitialized data
        A03E address of entry point -->> Dikkat!
        1000 base of code

    0: kd> u 0x8949f000+0Xa03e
      FsFlt+0xa03e:
        894a903e 8bff            mov     edi,edi
        894a9040 55              push    ebp
        894a9041 8bec            mov     ebp,esp
        894a9043 e8bdffffff      call    FsFlt+0xa005 (894a9005)
        894a9048 5d              pop     ebp
        894a9049 e9c26fffff      jmp     FsFlt+0x1010 (894a0010)
        894a904e cc              int     3
        894a904f cc              int     3
    0: kd> bp 0x8949f000+0xa03e
    0: kd> g
    Breakpoint 0 hit
      FsFlt+0xa03e:
        894a903e 8bff            mov     edi,edi

Evet. Şu anda sürücünün başlangıç noktasındayız. Buraya ulaştıktan sonra işleri kolaylaştırmak için IDA'da sürücüyü açıp (bu arada, sürücüyü ve diğer bileşenleri zararlı yazılım bulaşmış makineden alabilmek için örneğin komut satırından `copy` komutunu kullanabilirsiniz), ardından programı taban adresini tekrar belirliyoruz. Bunun için *Edit->Segments->Rebase Program* yolunu izleyebilirsiniz. Benim sistemimde sürücü `0x8949f000` adresine yüklendiği için ben bu değeri kullanacağım.

Sürücü ilk olarak kayıt defterindeki parametreleri okumakla işe başlıyor. İlk başta `0x894A0063` adresinde çağırılan fonksiyon ile `HKEY_LOCAL_MACHINE/SYSTEM/CurrentControlSet/Services/FsFlt/Parameters/` içerisindeki değerler alınıyor. Burada önce `c5/fol_0` içerisinde bulunan normal dizin yolu alınıyor ardından indiricinin ismi de bunun sonuna eklenerek yeni bir dizin yolu elde edilip bu değer `c3/d0` içerisine yazılıyor. Böylece burası `C:\Windows\system32\mypathcom\dnscli1.dll` oluyor. Hemen devamında bu defa `c4/folder_0` içerisinde bulunan tam dizin yolu alınıyor ve sonuna yine indiricinin ismi eklenip bu defa `c1/f1` içerisinde saklanıyor (`\Device\HarddiskVolume2\Windows\system32\mypathcom\dnscli1.dll`). Yine votkanın zararları gibi bir şey bence ama emin olamadım... Buradaki bilgiler sürücünün hangi dosya/klasörleri/kayıt girdilerini gizleyeceğini, hangi dosyayı explorer işlemine enjekte edeceğini belirliyor. Sonrasında sürücünün dosya/klasör gizleme işlemi için kullanacağı mini süzgeç(ya da mini filtre, ya da mini-filter) kaydı gerçekleşiyor. Bu mini süzgeç sürücüleri nedir derseniz, bu tür sürücüler çeşitli G/Ç işlemleri olduğu zaman (mesela dosya oluşturma, silme gibi) bildirim alan sürücülerdir diyebiliriz.

Hemen sonrasında ise bahsi geçen kuralların okunması başlıyor. Kayıt defterinde bulunan çeşitli parametreler ile gizlenecek ve kullanılacak olan dosya/klasörler genel değişkenlere aktarılıyor.

![](/files/sednit-girdiler-okunuyor.png)

Bu girdiler genel değişkenlere alındıktan sonra bahsi geçen bildirimler sürücüye geldiğinde bu genel değişkenler aracılığıyla bir karşılaştırma yapılıyor. Eğer bildirimi gelen dosya/dizin/kayıt defteri girdisi bu genel değişkenler içinde var ise sürücü ona göre işlem yapıyor. Bu arama işlemini yapan fonksiyon şu şekilde:

![](/files/sednit-karsilastirma.png)

Görüldüğü üzere iki parametre alıyor, bunlardan ilki kontrol edilecek olan değer, diğeri ise bir sayı. Bu sayı ilk parametrenin nerede kontrol edileceğini belirliyor. Örneğin bu değer bir ise, `DosyaYolu`, iki ise `KayitDefteriYolu` ve üç ise `DizinYolu` genel değişkenleri kullanılıyor. Ardından bu genel değişkenlerin içerisindekiler ile bize gelen değer `RtlCompareUnicodeString()` fonksiyonu karşılaştırılarak kontrol ediliyor. Bu fonksiyonun çağırıldığı yerlerin isimleri bize ne olduğu konusunda güzel fikir de veriyor:

![](/files/sednit-karsilastirma-cagiranlar.png)

Sonrasında mini süzgeç sürücünün dosyaları işlemeye başlaması için `FltStartFiltering()` fonksiyonu ile G/Ç işlemleri için bildirim alınmaya hazır olunduğu bilgisi G/Ç yöneticisine bildiriliyor. Bu noktadan itibaren artık G/Ç işlemlerinde bu mini süzgeç sürücüsüne de bildirim gelecek. Peki hangi işlemler için? Bu konuyu biraz daha açmak gerekiyor havada kalmaması adına.

Çok basit olarak anlatırsam, bir mini süzgeç sürücüsünün etkinleştirilmesi sırasında `FltRegisterFilter()` ve `FltStartFiltering()` fonksiyonları temel olarak kullanılır. `FltRegisterFilter()` fonksiyonu adından da anlaşılabileceği gibi bir mini süzgeç sürücüsünü kullanılmak üzere kayıt eder. Bunu yaparken aldığı üç parametre var:

1. *Driver*       : Mini süzgeç sürücüsü için sürücü nesnesine gösterici
2. *Registration* : Sürücü tarafından tahsis edilmiş olan ve mini süzgeçi tanımlayan `FLT_REGISTRATION` yapısı
3. *RetFilter*    : Sürücü tarafından tahsis edilmiş olan ve mini süzgeç sürücüsüne gösterici alacak olan değer.

Bunlardan konuyu anlamak için en önemlisi *Registration* parametresi. Bu parametrenin beklediği veri yapısı şu şekilde:

    struct _FLT_REGISTRATION {
      USHORT                                      Size;
      USHORT                                      Version;
      FLT_REGISTRATION_FLAGS                      Flags;
      const FLT_CONTEXT_REGISTRATION              *ContextRegistration;
      const FLT_OPERATION_REGISTRATION            *OperationRegistration;
      PFLT_FILTER_UNLOAD_CALLBACK                 FilterUnloadCallback;
      PFLT_INSTANCE_SETUP_CALLBACK                InstanceSetupCallback;
      PFLT_INSTANCE_QUERY_TEARDOWN_CALLBACK       InstanceQueryTeardownCallback;
      PFLT_INSTANCE_TEARDOWN_CALLBACK             InstanceTeardownStartCallback;
      PFLT_INSTANCE_TEARDOWN_CALLBACK             InstanceTeardownCompleteCallback;
      PFLT_GENERATE_FILE_NAME                     GenerateFileNameCallback;
      PFLT_NORMALIZE_NAME_COMPONENT               NormalizeNameComponentCallback;
      PFLT_NORMALIZE_CONTEXT_CLEANUP              NormalizeContextCleanupCallback;
    #if FLT_MGR_LONGHORN
      PFLT_TRANSACTION_NOTIFICATION_CALLBACK      TransactionNotificationCallback;
      PFLT_NORMALIZE_NAME_COMPONENT_EX            NormalizeNameComponentExCallback;
    #endif 
    #ifdef FLT_MFG_WIN8
      PFLT_SECTION_CONFLICT_NOTIFICATION_CALLBACK SectionNotificationCallback;
    #endif 
    } FLT_REGISTRATION, *PFLT_REGISTRATION; 

Bu yapının içerisinde mini süzgeç ile ilgili birçok alan var fakat bizim için şu an önemli olan `OperationRegistration` kısmı. Buradaki yapı ise şöyle:

    struct _FLT_OPERATION_REGISTRATION {
      UCHAR                            MajorFunction;
      FLT_OPERATION_REGISTRATION_FLAGS Flags;
      PFLT_PRE_OPERATION_CALLBACK      PreOperation;
      PFLT_POST_OPERATION_CALLBACK     PostOperation;
      PVOID                            Reserved1;
    } FLT_OPERATION_REGISTRATION, *PFLT_OPERATION_REGISTRATION;


*OperationRegistration* kısmı, `_FLT_OPERATION_REGISTRATION` dizisinden oluşuyor. Buradaki her `_FLT_OPERATION_REGISTRATION` girdisi ayrı bir G/Ç işlemini tanımlıyor. Mesela bu veri yapısındaki *MajorFunction* kısmı `IRP_MJ_CREATE` olduğunda *PreOperation* kısmına hangi fonksiyon koyulursa bir `IRP_MJ_CREATE` işlenmeden önce o fonksiyon çağırılır, yani önişlemci gibi düşünün, eğer var ise *PostOperation* kısmı da o G/Ç işlemi bittikten sonra çağırılır, bu da yapılan G/Ç işlemi üzerindeki son düzenlemeleri yaptığınız fonksiyon gibi oluyor yani. Bu konuyu daha fazla deşmek istemiyorum çünkü konunu dışına çıkmaya başlıyoruz...

Velhasıl, bu veri yapılarını ve fonksiyonları tanımladıktan sonra `FltStartFiltering()` fonksiyonunu kullanarak mini süzgeç sürücünüze bildirim almaya başlayabilirsiniz. Ha, bir de alım sıranız diye bir şey var. Yani sizden başka da mini süzgeç sürücüleri var. Bu bildirimler size ne zaman, hangi sırada gelecek? İşte onu da "*altitude*" denilen bir değer belirliyor. Süzgeç yöneticisi (hahaha) mini süzgeç sürücülerini bu değerin azalan sırasına göre çağırıyor. Bu değer de sürücüyü kaydettirirken sisteme bildiriliyor.

Bu zararlının mini süzgeç sürücüsünde `IRP_MJ_CREATE`, `IRP_MJ_SET_INFORMATION` ve `IRP_MJ_DIRECTORY_CONTROL` G/Ç işlemleri için süzgeç rutinleri mevcut. Örneğin `IRP_MJ_CREATE `için olan *PreOperation* girdisini şurada görebiliriz: 

![](/files/sednit-preope.png)

Burada bulunan fonksiyon bir `IRP_MJ_CREATE` bildirimi geldiğinde çalıştırılacak olan fonksiyon. Bu fonksiyonun yaptığı şey ise oluşturulacak/erişilecek olan dosyanın sürücünün gizlenecek dosyalar listesinde olup olmadığını belirlemek ve ona göre dosyayı gizlemek. Bunu da aşağıdaki kod parçacığında gerçekleştiriyor:

![](/files/sednit-dosyadizin-kontrol.png)

Burada dikkat ederseniz dosya bilgisi alınıyor. Ardından bu dosya isminin zararlının gizlemesi gereken dosya listesinde olup olmadığı kontrol ediliyor. Eğer olumlu sonuç dönerse geriçağırım verisinin `IoStatus.Status` alanı `STATUS_NOT_FOUND` yapılıyor. Bunun yapılması sistemde o dosya sanki yokmuş gibi bir yanılsama oluşturuyor bu sayede o dosya gizlenmiş oluyor. `FltSetCallbackDataDirty()` fonksiyonu ise geriçağırım verisi üzerinde değiştirme yapıldığını bildirmek için kullanılıyor. Benzer bir durum ayrıca dizin oluşturma/listeleme için de geçerli. Onda da buradakine benzer işlemler bu defa dizinler için gerçekleştiriliyor.

Bu süzgeç olayından sonra çekirdek modülü kayıt defteri için geriçağırım fonksiyonunu ekliyor. Bu nedir derseniz, tıpki mini süzgeç sürücüleri gibi fakat bu defa G/Ç işlemlerinde değil de kayıt defterinde yapılan işlemlerde bildirim geliyor. Bu bildirim fonksiyonunun kaydedilmesi için `CmRegisterCallbackEx()` fonksiyonunu kullanıyor. Basit olarak bu fonksiyon kayıt defterinde bir işlem olduğunda çalışacak olan bir fonksiyon, ve bu fonksiyona verilecek olan içeriği alıyor.

Bildirim fonksiyonu iki kontrol yapıyor ve bu kontrolleri gelen bildirim eğer `RegNtPostEnumerateKey` değerine sahipse yapıyor. Bunlardan birincisi erişilmekte olan kayıt defteri girdisinin gizlemesi gereken girdilerden biri olup olmadığı. Eğer öyle ise sıra ikinci kontrole geçiyor. İkinci kontrol ise bu kayıt defteri işleminin yapan işlemin ismi içerisinde `services.exe` olup olmadığının test edilmesi. Muhtemelen sürücüsü ile ilgili yapılan yönetim işlemlerinin engellenmemesi için `services.exe` işlemini gizleme işleminin dışında tutuyor. 

![](/files/sednit-kayit-defteri-sorgu.png)

Bu arada şunu ekleyeyim, benim incelediğim örnek sanırım bazı hatalar içeriyor. Örneğin aracı yazılım sürücünün parametrelerini ayarlarken gizlenmesi gereken kayıt defteri girdilerini (`Parameters/c2` kısmına) eklemiyor. Sanırım ara formlardan biri benim elimdeki. Öyle ya da böyle, yine de şu göze çarpıyor ki `services.exe` ismine sahip dosyalar kayıt defteri girdilerine ulaşabilmekteler. Yani regedit.exe->services.exe yaparsanız gizlenen girdilere tekrar ulaşabiliyorsunuz.

Kayıt defterinin ardından sürücü oluşturulan işlemlerin takibini yapabilmek için `PsSetCreateProcessNotifyRoutine()` fonksiyonu ile bir bildirim rutini kaydediyor. Bunun ardından sistemde oluşturulan (ve yok edilen) tüm işlemler için bu sürücüye bildirim gelmeye başlayacak. Bunu yapmasının sebebi ise indiricisini (*Downdelph*) **explorer** işlemine enjekte etmek. Bunun dışında bu bildirim fonksiyonunun kaydedildiği yerde DLL enjeksiyonu sırasında kullanılan bir *Olay*(Event) nesnesi oluşturuluyor, ayrıca enjeksiyonu yapacak olan `DllControlThread()` fonksiyonunu çalıştıran bir işlemcik(thread) de oluşturuluyor.

Aşağıda **explorer** işleminin sonlandırılıp tekrar açılması sırasında *DbgView* ekranında görünen mesajları görüyorsunuz:

![](/files/sednit-enjeksiyon.png)

Aşağıdaki kod ise işlem oluşturma/yok etme sırasında çağırılan fonksiyona ait:

    if ( IsInjected )  // Daha önce enjeksiyon yapılmış mı?
    {
      if ( !Create && explorerId == ProcessId ) // Evet yapılmış, islem sonlandiriliyor mu ve şimdiki işlemin belirteci  
                                                // alinan explorer isleminin belirteci ile ayni mi?
      {
        // Aynı.
        IsInjected = 0;  // Artık bir enjeksiyon yok.
        explorerId = 0;  // Explorer belirteci de yok.
        if ( debugLevel >= 5 )
        {
          DbgPrint("HIDEDRV: CreateProcessNotify: Dll inject process terminated %u\n", ProcessId);
        }
      }
    }
    else if ( Create )  // Enjeksiyon yapılmamış, peki şu an bir işlem oluşturuluyor mu?
    {
      if ( HideGetProcessIdByName(L"explorer.exe", &ProcessId) >= 0 ) //evet, explorer.exe'nin belirtecini bul
      {
        explorerId = ProcessId;         // belirteci genel değişkene koy
        KeSetEvent(&InjectEvent, 0, 0); // explorer'ı buldugunu belirtmek icin olayı sinyalle
      }
    }

Son olarak DLL enjeksiyonunun gerçekleşebilmesi için `InjectEvent` isimli olay nesnesi üzerinde bekleme yapılıyor. Yukarıda görülebileceği gibi bu olay nesnesi `explorer.exe` işleminin IDsi alındığında sinyalleniyor. Bu olay nesnesi ise biraz önce işlemciği oluşturulan `DllControlThread` isimli fonksiyonda bekleniyor, bekleme tamamlandığında ise explorer.exe işlemine DLL enjeksiyonu gerçekleştiriliyor:

    while ( 1 )
    {
      KeWaitForSingleObject(StartContext + 52, 0, 0, 0, 0);    // StartContext+52 = InjectEvent 
      DelayThread(0x7D0u);
      if ( (LoadDll(*(StartContext + 11)) & 0x80000000) != 0 ) // LoadDll parametresi explorer.exe'nin belirteci
      {
        *(StartContext + 11) = 0; // Durum başarısız
      }
      else
      {
        *(StartContext + 40) = 1;  // Başarılı
        if ( debugLevel >= 5 )
        {
          DbgPrint("HIDEDRV: ");
          DbgPrint("DllControlThread: Dll injected success in 0x%x\n", *(StartContext + 11));
        }
      }
      
      KeClearEvent((StartContext + 52)); // InjectEvent olayını temizle
    }

DLL enjeksiyonu için TDL3/TDL4 rootkitlerinde kullanılan *APC* yöntemi burada da kullanılıyor (APC nedir bakmak için önceki yazılara göz atabilirsiniz). Buradaki esas önemli fonksiyon `LoadDll()` fonksiyonu. Yaptığı şey ise oldukça basit, öncelikle **explorer** işleminde uyarılabilir bir işlemcik buluyor. Bunu yapmasının sebebi APCnin hemen işleneceğinden emin olmak. Ardından *APC* ile *DLL* enjeksiyonu yapmak için **explorer** işleminin bağlam alanına geçiliyor (`KeStackAttachProcess()` ve `KeUnstackDetachProcess()` fonksiyonları yardımıyla) çünkü bildiğiniz gibi işletim sistemindeki işlemler birbirinden izole durumdadırlar. Bu nedenle bir işlemin bağlam alanının X adresinde "*gardırop fuat*" verisi varken başka bir işlemin yine aynı X adresinde "*armut*" verisi olabilir. Ardından `kernel32.dll` isimli DLL dosyasının adresi elde ediliyor, sonra bu DLL içerisinden `LoadLibraryW` fonksiyonunun adresi alınıyor:

![](/files/sednit-apc-dll-hazirlama.png)

Ardından sürücü **explorer** işleminin içerisinde yüklenecek olan DLL ismini yazmak için bir alan ayırıp, enjeksiyonunu yapacağı DLL ismini o alana yazıyor. Son olarak da bu alanın adresini parametre olarak alacak olan `LoadLibraryW` fonksiyonu bir APC kullanarak hedef olan işlemin bağlam alanında çalıştırıyor:

![](/files/sednit-apc-enjeksiyonu.png)

Sonuç olarak zararlının indiricisi, explorer işlemine enjekte edilmiş olacak ve o işlem içerisinden kontrol sunucusu ile iletişime geçip aldığı görevleri yerine getirecek. Bu zararlının analizi aşağı yukarı böyle. Biraz aceleye geldi fakat sanıyorum genel hatlarıyla anlaşılmıştır. Ayrıca dediğim gibi benim elimde bulunan örnek sanırım geliştirme sürecinden kalan bir örnek. Kodun birçok yerinde garipsenecek parçacıklar falan var o nedenle muhtemelen bunun değişik sürümleri de vardır diye düşünüyorum.

Sevgiler...
