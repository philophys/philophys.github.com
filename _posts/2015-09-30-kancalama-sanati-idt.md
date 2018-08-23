---
title: Kancalama Sanatı - IDT
categories: Bilgisayar
---

Selamlar.

Kancalama konusundaki ikinci yazıda **IDT**, yani Kesme Tanımlayıcı Tablosunu kancalamadan bahsedeceğiz. Giriş kısmında hiç lafı uzatmadan direkt konuya giriyorum. Evvela sanıyorum ki blogdaki özellikle bu yazıda çok fazla dallanma yaşayacaz. Çünkü yalnızca **IDT**'yi ve kesme yapısını net biçimde anlatmak için birçok temeli anlatmamız gerekiyor. Daha önceki yazılarda **IDT** temellerini yazılımsal tarafta basitçe anlatmışık ama işler pek o kadar ile sınırlı gibi değil.. Başlayalım..

## IDT nedir? IDT kancalamak ne demek?
Daha önce IDT ile ilgili birkaç şey şöylemiştim([1](/posts/isletim-sistemlerinde-kesme-ve-istisna-yonetimi.html),[2](/posts/api-cagrilari-system-call-dispatcher-ve-dahasi.html)). O yazılarda hızlı bir göz attığımda bazı hatalar yakaladım, ama temelinde bir sorun olduğunu sanmıyorum. Yine de biz burada da oradaki anlatımların kısa bir özetini yapalım. IDT tabloları (evet, tabloları) işletim sistemi tarafından gerçek moddan korumalı moda geçerken **IVT**<sup>[1](https://en.wikipedia.org/wiki/Interrupt_vector_table)</sup>'ye karşılık olarak yaratılır. Her işlemcinin kendi IDT adresini gösteren ayrı bir **IDTR** yazmacı bulunmaktadır, yani her işlemcinin kendi **IDT** tablosu var. Bunu bilmek önemli çünkü <u>IDT kancalama yaptığınızda diğer işlemcileri unutmamalısınız.</u> Basit olarak IDT tablosu **ISR**<sup>[2](https://msdn.microsoft.com/en-us/library/windows/hardware/ff547974(v=vs.85).aspx)</sup>(Interrupt Service Routines - Kesme Servisi Rutinleri)'lara erişmemizi sağlayan **8** bayt boyutunda (Interrupt Gate-Kesme Kapısı) yapılar içermektedir. Bu rutinler bahsi geçen kesme oluştuğunda yapılacak olan işlemleri içeriyor isminden anlaşılacağı gibi. İşletim sistemi kesme her çalıştığında ona ait olan ISR'yi çalıştırarak gerekli işlemlerin gerçekleşmesini sağlıyor. Son olarak ilk 32 girdimiz CPU için ayrılmış olup, geri kalanlar sistem ve kullanıcının kullanımına bırakılmıştır. 

IDT kancalama ise, basitçe IDT içerisinde bir girdideki ISR adresini bizim oluşturduğumuz ISR ile değiştirmek demek. (Ya da dilerseniz komple IDT girdisini de değiştirebilirsiniz tabi..) Yani kısaca asıl kesme rutinini, bizim belirlediğimiz rutin ile değiştirmek demek. Yani aşağı yukarı aşağıdakine benzer bir şey:

![](/files/idtkancalamak.png)

Bu temel bilgilerin dışında bir de IDT girdilerinin yapılarını incelememiz yerinde olacak, çünküm kancalama yaparken bu yapıyı bilmezsek ekranı maviye boyayabiliriz :) (kutucuktaki assembly parçacığına geleceğiz meraklanmayın, yani konuyu merak edin ama oraya gelmeyecek mi demeyin eheh) IDT girdilerinin yapısı **Interrupt Gate** ismi verilen bir yapıdır. Tanımlayıcının *Gate Type* kısmı `1110` olduğunda bu tanımlayıcının Interrupt Gate(Kesme kapısı) olduğunu anlıyoruz. Pekiyi bu kapıların yapısı nasıldır? Bir büyüğümün deyimiyle böyle zamanlarda "suyun kaynağına" bakmamız gerekir. Yani Intel kitapçıklarına(kitapçık denilirse tabi..). Volume 3A P1 sayfa 6-15<sup>[3](http://download.intel.com/design/processor/manuals/253668.pdf)</sup>'e bakarsak IDT girdilerinin yapılarını görebiliriz:

![](/files/idtediyenintel.png)

Kısaca **Offset** alanları ISR'nin bulunduğu adresi, **P** biti tanımlayıcının geçerli olup olmadığını gösteriyor. **DPL** önceki yazılardan hatırlayacağınız üzere tanımlayıcının öncelik seviyesini belirtiyor. Mesela kullanıcı modundan çağırılacak bir kesmenin **DPL** değerinin **3** olması gerek (hatırlayın, user-mode öncelik seviyesi 3 idi), aksi taktirde işlem yetersiz yetki yüzünden kesilir. Başka.. **Segment Selector** kullanılacak Kod segmentinin ID numarası ve son olarak **D** biti de 1 olduğu durumda 32 bit, 0 olduğunda 16 bit boyutunda kesme kapısı olduğunu belirtiyor.

Bu yapıyı baz alarak IDT girdisini belirtecek yapıyı bit alanlarını da kullanarak şu şekilde tanımlayabiliriz:

    typedef struct _IDT_DESCRIPTOR{
        UINT16 offset_low;    //ISR'nin ilk 16 bitlik bölümü(0-15)
        UINT16 s_selector;    //Segment selector (CS yazmacına koyulacak)
        UCHAR  reserved:5;    //Kullanılmıyor
        UCHAR  zero    :3;    //Sıfır
        UCHAR  d_type  :5;    //Kesme kapısı->01110(e)
        UCHAR  DPL     :2;    //Öncelik seviyesi
        UCHAR  P       :1;    //Present(mevcut) bayrağı
        UINT16 offset_high;   //ISR'nin ikinci 16 bitlik bölümü(16-31)
    }*PIDT_DESCRIPTOR;

Aslında burda **d_type** kısmı 4 bit, baştaki 0 aslında **S** biti. **S** biti tanımlayıcının hafıza(kod,veri gibi) segmenti olup olmadığını belirtiyordu. Bu tanımlayıcı hafıza segmenti belirtmetiği için bu bit 0, yani <u>sistem segmenti</u>. Ayrıca bir de **IDT** tablosunu tutmak için bir yapı tanımlayalım. Bu yapı **IDTR** yazmacının içeriğini tutacak. Bu **48** bitlik yazmaç içerisinde **IDT**'nin adresi(32 bit) ve limit bilgisi(16 bit) bulunuyor. Öyleyse şöyle bir yapı kullanabiliriz:

    typedef struct _IDT{
        UINT16          limit;       //IDT limiti (16 bit)  
        PIDT_DESCRIPTOR descriptors; //IDT Girdileri (32 bit) sizeof(PIDT_DESCRIPTOR) dikkat et!
    }IDT;

Buradan sonra yapmamız gereken ise basitçe `sidt` komutu ile **IDTR** yazmacının içeriğini tanımladığımız **IDT** yapısıyla gösterecek şekilde almak. Bunu yaptıktan sonra her şey çorap söküğü gibi geliyor. Tek yapmamız gereken `IDT.descriptors[index_Numarası]` şeklinde bir kullanım ile **IDT**'nin istediğimiz girdisine ulaşmak. Mesela **IDT**'nin limiti kadar bir for döngüsü ile tüm girdi bilgilerini kolayca alabiliriz. (Bu şekilde IDT tablosunun girdilerini kontrol edebilirsiniz, belki de koruma amaçlı bir yazılımın IDT ile ilgili kısmının temeli olur..) (Dennis Ritchie'yi sevgiyle anıyorum :)

Şimdi burada girmemiz gereken bir ayrıntı daha var.(Aslında o kadar çok var ki..) O da `_KINTERRUPT` yapısına sahip olan kesmeler hakkında. Bu yapı nedir derseniz, donanım kesmelerinde kullanılan yapıdır. Literatürde kesme nesneleri(Interrupt Objects) diye geçiyor. Kesme nesneleri aygıtların kendi **ISR**'lerini yazıp(aygıt kendi yazmıyor tabi, sürücüyü yazan adam demek istiyorum burada) kaydettirmelerine izin veriyor. Sürücüler bunu yapmak için `IoConnectInterrupt` fonksiyonunu kullanıyor ve bu kesme nesneleri işlemcinin kesme için ihtiyaç duyacağı bilgileri içeriyor. Örneğin gereken **IRQL**(Interrupt Request Level), şu anki **IRQL**, kullanılacak **ISR** adresi gibi.. Sistemde ne zaman bir kesme nesnesi oluşturulursa, bahsettiğimiz bilgilerin yanında "dispatch code" denilen bir kod da kernel tarafından hazır bir taslaktan(*KiInterruptTemplate*) kopyalanıp bu nesnenin sonuna ekleniyor. Ve son olarak ne zaman bu kesme çağırılırsa işte önce bu kod çağırılıyor, ardından kendisi gerçek rutini çalıştıracak olan koda kesme nesnesini argüman olarak verip çağırıyor. Teoride biraz karışık gibi oldu ama pratiğe dökünce umarım anlaşılacak. Fakat öncelikle yine bir konu açtık, onu da açıklamamız gerek : **IRQL** ve kesmelerin nasıl çalıştığı.

## [IRQL](http://blogs.msdn.com/b/doronh/archive/2010/02/02/what-is-irql.aspx) nedir? Windows kesmeleri nasıl yönetiyor?
Şimdiii... Her şey o kadar birbiri ile bağlantılı ki. Tek bir kavramı anlatmak çok yorucu olabiliyor. Basitçe **IRQL** dediğimiz şey, kesmelerdeki öncelik sırasını belirlemek için (de) kullanılıyor. Ama esasında **IRQL** dediğimiz şey "mask ability" dediğimiz, yani maskeleme yeteneği olarak çevirebileceğimiz bir kavramı temsil ediyor diyebiliriz. Kernel bize 0'dan 31'e kadar bir **IRQL** seviyesi aralığı tanımlıyor ve aşağıdan yukarıya doğru çıktıkça öncelik seviyesinin arttığı anlamına geliyor. Yani, işlemcinin şu anki **IRQL** değerinden yüksek değere sahip bir kesme, işlemcinin şu anki **IRQL** değerine eşit ya da daha düşük bir **IRQL** değerine sahip diğer kesmeleri maskeliyor, yani öncelik olarak onların önüne geçiyor ve daha önce işlem görüyor. Düşük seviye **IRQL** değerine sahip olanlar ise, yüksek seviyeli olan işlemin **IRQL** değerini düşürmesini bekliyor, düşürdükten sonra çalışıyor. Misal, örneğin kernel ve user modda kodların çoğu Passive Level(0)da çalışıyor. Yani büyük bir kısmın bu seviyede çalıştığını söyleyebiliriz. İşletim sistemi çalışırken bu **IRQL** seviyesi duruma göre yükseltilip düşürülerek işlemler yapılıyor. Aşağıda **IRQL** seviyelerini görmektesiniz.

![](/files/irqllevels.gif)

Bu arada her işlemcinin kendi **IRQL** seviyesi olduğunu unutmayalım.(Bu da başlı başına bir konu..) Şimdi **IRQL**'den kısaca bahsettikten sonra Windows'un kesmeleri nasıl yönettiğine gelelim.

### Kesmelerin yönetilmesine birazcık derin bakış
Donanım kesmelerinin çoğu asenkron olarak çevre birimleri tarafından üretilir. Yani şunu demek istiyorum, bu kesmeleri ne zaman olacağı genelde belli değildir. Mesela klavyede bir tuşa bastınız, ve işte klavye kesmesi(klavye kesmesi ne ya eheh) oluştu. Fare ile bir şeyler yaptınız ve onun kesmesi oluştu gibi. Biz konumuza klavyeden devam edelim zaten kancayı da ona atacağız.. Öncelikle bir diyagram göstermek istiyorum:

![](/files/anakart-diyagram.png)

Yukarıda gördüğünüz, aslında anakartın özetidir diyebiliriz. Anakartınız işte burada gördüğünüz temel üzerine çalışmaktadır. Yalnızca bu diyagram üzerine muhtemelen sayfalarca yazı yazılabilir fakat olabildiğince küçük tutmamız gerekiyor yazı gereği. Diyagramda bolca geçen "Bus", bilgisayar içindeki parçaların arasında veri transferi yapmaya yarayan bir iletişim sistemidir. **FSB**(Front Side Bus) dediğimiz bağlantı kısmı CPU'nun *North bridge* ([Kuzey köprüsü](https://en.wikipedia.org/wiki/Northbridge_(computing))) ile arasındaki bağlantıyı sağlar, doğal olarak CPU bu bağlantıyı kullanıp tüm sistemle iletişime geçer. Kuzey köprüsü dediğimiz RAM'leri ve ekran kartını CPU'ya bağlayan kısımdır. *South bridge*([Güney köprüsü](https://en.wikipedia.org/wiki/Southbridge_(computing))) ise sistemin geri kalan birimlerini(Genellikle USB, PCI, PS/2, Ses, Disk gibi.. (Klavye buna bağlı dikkat)) Kuzey köprüsü aracılığı ile CPU'ya bağlayan kısımdır. Kuzey köprüsü ve Güney köprüsü arasındaki bağ ise *Internal Bus* dediğimiz bağlantı sayesinde sağlanır. (Diğer bileşenler için google yapabilirsiniz, veya mail gönderebilirsiniz)

![](/files/lapic-ioapic.jpg)

Yukarıdaki görsele kısaca bir göz gezdirin.. Gezdirdiniz mi? Tamam. Şimdi klavyedeki herhangi bir tuşa basalım. Bastınız. Bastığınızda klavye sürücünüz *South bridge* üzerinden *North bridge*ye ve sonucunda CPU'a ulaşan bir **IRQ**(Interrupt ReQuest) gönderdi. Pekiyi **IRQ** ne işe yarıyor? Çevre birimleri bir işlem yapacağını CPU'ya bu yolla bildiriyor diyebiliriz. Burada şuna da girmemiz gerekiyor bu çevre birimlerinin isteklerini yönetmek için bir kontrolcü var, o da (şu an [i8259a](https://en.wikipedia.org/wiki/Intel_8259)) *Advanced Programmable Interrupt Controller*(APIC). Normal *PIC*(daha önceleri kullanılan, tek işlemci destekleyen kontrolcü) ile arasındaki fark nedir derseniz, **APIC** onun yeni versiyonu ve kendisi çoklu işlemciye destek veriyor, ayrıca PIC *15 IRQ* hattına izin verirken, **APIC** 256'ya kadar izin verebiliyor. (Lütfen üstteki resmi tekrar inceleyin, çoklu işlemcili bir sistemdeki APIC yapısını temel olarak göreceksiniz. *IPI* olarak gördüğünüz APIC'lerin birbirleri ile iletişim sağlaması için) **APIC** kendi içinde ikiye ayrılıyor. Bunlardan biri **I/O APIC**, kendisi bahsettiğimiz birimlerden kesmeyi alan asıl kısım. **Local APIC** dediğimiz kısım ise, **I/O APIC**'den kesmeyi alıp CPU'ya ulaştıran kısım. **LAPIC**(Local APIC) kesmeyi aldıktan sonra **IRQ** değerini 8 bitlik bir değere dönüştüyor. İşte bu değer de bizim **IDT** indeximiz oluyor. Son olarak her çekirdeğin kendi **Local APIC** kısmı mevcut, **I/O APIC** ise her CPU için bir tane. Özet olarak siz klavyeye (ehehe) bastığınızda olay kısaca şöyle vuku buluyor:

    Klavyede tuşa basıldı -> I/O APIC -> Local APIC -> CPU -> IDT -> _KINTERRUPT.ServiceRoutine -> Klavyenin ISR'si

Velhasıl sonuç olarak **ISR** çağırıldığında birtakım işlemlerle birlikte(misal diğer kesmeleri maskeleme gibi) gerekli **IRQL** yükseltmesi gerçekleşiyor, ISR işini bitirdikten sonra windows tekrar **IRQL** seviyesini eski değerine döndürerek(Arttırma: [KeRaiseIrql](https://msdn.microsoft.com/en-us/library/windows/hardware/ff553079(v=vs.85).aspx) Azaltma:[KeLowerIrql](https://msdn.microsoft.com/en-us/library/windows/hardware/ff552968(v=vs.85).aspx)) **ISR**'nin çalışmasını sonladırma aşamasına doğru geliyor.. Burada genellikle devreye **DPC** giriyor ki ondan birazdan bahsedeceğim.. Şunu da bir not olarak ekleyelim, örneğin işletim sistemindeki scheduler **IRQL** 2 değerinde çalışıyor. Bu arkadaş basitçe sistemdeki işlemlerin daha doğrusu threadlerin değişmeli olarak çalıştırılmasından sorumlu diyebiliriz. Pekiyi, scheduler mekanizmasının **IRQL** 2'de çalıştığını öğrendik, ya eğer sizin sürücünüzde, kodunuzda **IRQL** değeri 2'den yukarıda kalırsa ne olur? Çok basit! Mavi ekranı alırsınız. (Yani meşhur irql_not_less_or_equal) 

### [DPC](https://msdn.microsoft.com/en-us/library/windows/hardware/ff544084(v=vs.85).aspx)(Deferred Procedure Call) nedir?
ISR'ların çalışmasında ince bir nokta vardır ki o da şudur: **ISR**'larin işlerini çok uzatmaması, olabildiğince asgari çalışıp işin geri kalanını IRQL 2(DPC/Dispatch level)de çalışan **DPC** mekanizmasına bırakması gerekiyor. Yani basitçe şunu diyebiliriz, **ISR** çalışıyorken donanımdan veriyi alıyorsunuz ve bir **DPC** sıraya koyuyorsunuz, böylece aldığınız o veriyi kesmeden çıkabilmenize olanak sağlayarak **DPC** işliyor. Bu sayede performans kaybı da azalmış oluyor. Çünkü hatırlayın, kesme sırasında donanım ile ilgileniyorsunuz. Ve butün işi bu kesme içinde yapmanız demek performans ve doğal olarak zaman kaybı demektir. Pekiyi, iyidir, çok hoşdur, ama **DPC** nedir?

**DPC** basit olarak yüksek öncelikli işlemlerin daha sonradan çalıştırılmak üzere düşük seviyeli işlemleri oluşturmasına izin veren işletim sistemi mekanizmasıdır. **DPC**'ler *DPC nesneleri* tarafından tanımlanır ve bu nesneler ise kernel tarafından örneğin bir sürücü **DPC** kaydı yaparsa yaratılır. Ardından bu sürücünün yaptığı **DPC** isteği çalıştırılmak üzere **DPC** kuyruğuna eklenir. Bilgisayardaki her işlemcinin kendi **DPC** kuyruğu olduğunu da ekleyelim. Bu yazıda **DPC** kullanmayacağız(inşallah başka bir yazı için kafamda duruyor) fakat yapının anlaşılabilmesi için gerekli idi bu nedenle araya sıkıştırdım onu da. Sanırım artık pratiğe dökme aşamasına geçebiliriz.. Birkaç cümle daha yazarsam sanki başka bir yapıyı/mekanizmayı daha açıklamak zorunda kalacak gibiyim. Ama inanın ki başka türlüsü mümkün olmuyor, çünkü tüm sistem inanılmaz bir mükemmellik ve bağlılık içerisinde...

### Pratiğe dökme zamanı
Hadi o zaman kısaca teorisini gördüğümüz bilgileri bir de pratikte görelim. -Yazı boyunca *Windows 7 32 bit* bir makine kullanıyorum- **Windbg** ile kernel debugging yapalım ve **IDT** ve kesmelerin yönetimi hakkında teoride gördüklerimizi pratiğe dökelim. Öncelikle **IDT**'nin taban adresini ve limitini öğrenelim.

    kd> r idtr, idtl
        idtr=80b95400 idtl=000007ff

**IDT** taban adresini ve limitini görüyorsunuz. Bu taban adresine bir bakalım neler var..

    kd> dq @idtr
        80b95400  82a68e00`00080200 82a68e00`00080390
        80b95410  00008500`00580000 82a1ee00`0008cffb
        80b95420  82a6ee00`00080988 82a68e00`00080ae8
        80b95430  82a68e00`00080c5c 82a68e00`00081258
        80b95440  00008500`00500000 82a68e00`000816b8
        80b95450  82a68e00`000817dc 82a68e00`0008191c
        80b95460  82a68e00`00081b7c 82a68e00`00081e6c
        80b95470  82a68e00`0008251c 82a68e00`000828d0

Dikkat ederseniz `dq` (Quad-word, 64 bit) kullandım çünkü **IDT** girdilerinin 64 bit olduğunu biliyoruz böylece daha göze kolay anlaşılır gözüküyor çıktı. Burda ilk girdimiz `82a68e00 00080200` değerine sahip ikinci 4 bayt(32 bitlik kısım), yani `00080200` bizim selektörümüzü ve **ISR** adresinin ilk 16 bitini içeriyor. Baktığımızda bu değer `0200` ve `0008`. Yani selektörümüz 8(*dg 8* ile bakabilirsiniz) indexine sahip, ve ilk 16 bitlik adres değerimiz `0200`. İkinci 4 baytlık değerimiz ise, yani `82a68e00` Son 16 bit(2 bayt) yani **ISR**'nin geri kalan adres değerini alırsak `82a6` ve tanımlayıcıda geri kalan `8e00` de bizim DPL, kapı türü bilgilerimizi içeren kısım. 

Şimdi, burada istediğimiz **ISR**'nin bilgilerini nasıl alırız? Çok basit. **IDT_Taban + index\*8** gibi basit bir matematikle. Örneğin çağrı yapıldığında kullanılan `nt!KiSystemService`, *2e* indexine sahip. Yani:

    kd> !idt 2e
    Dumping IDT: 80b95400
        0000002e:   82a5f22e nt!KiSystemService

    kd> dq @idtr+0x2e*0x8 l1
        80b95570  82a5ee00`0008f22e

Burada gerekli ayırma ve birleştirmeleri yapınca **ISR** adresini `"82a5"+"f22e"` olarak alabiliyoruz. Dikkat edin string olarak birleştirdim, toplama değil ehehe. Bu arada dilerseniz ` _KIDTENTRY` yapısıyla da girdileri okuyabilirsiniz. Misal:

    kd> dt nt!_KIDTENTRY @idtr+0x2e*0x8
       +0x000 Offset           : 0xf22e
       +0x002 Selector         : 8
       +0x004 Access           : 0xee00
       +0x006 ExtendedOffset   : 0x82a5

Ayrıca **IDT** tablomuzun kendisine `!idt -a` komutu ile bakabilirsiniz, buraya koymuyorum uzamaması açısından.

Devam edelim.. `2e` indexine sahip kesmemizde dikkat ederseniz `_KINTERRUPT` yapısı yok. Başka bir kesme olan `81` numaralı klavyeye ait donanım kesmesine bakalım:

    kd> !idt 81
    Dumping IDT: 80b95400
        00000081:   84f627d8 i8042prt!I8042KeyboardInterruptService (KINTERRUPT 84f62780)

Gördüğünüz gibi bu kesmemizde **KINTERRUPT** yapısı da var. Pekiyi bu indexi yazının önceki bölümlerinde gördüğümüz **IRQ** hattı üzerinden nasıl öğrenebiriliz? Dediğimiz gibi birimler **IRQ** hattı sayesinde kesme işlemleri için iletişim kuruyordu. Windbg içerisinde `!ioapic` kullanarak sürücülerle ilişkilendirilmiş **IRQ**'ları görebiliriz. Dilersiniz önce [buradan](https://en.wikipedia.org/wiki/Interrupt_request_(PC_architecture)) hangi hatta neyin bağlandığının özetini görebilirsiniz. Gördünüz mü? Şimdi çıktımıza bakalım:

    kd> !ioapic
    IoApic @ FEC00000  ID:1 (11)  Arb:1000000
        Inti00.: 00000000`000100ff  Vec:FF  FixedDel  Ph:00000000      edg high      m
        Inti01.: 01000000`00000981  Vec:81  LowestDl  Lg:01000000      edg high       
        Inti02.: 01000000`000008d1  Vec:D1  FixedDel  Lg:01000000      edg high       
        Inti03.: 01000000`00000951  Vec:51  LowestDl  Lg:01000000      edg high       
        Inti04.: 01000000`00000961  Vec:61  LowestDl  Lg:01000000      edg high       
        Inti05.: 00000000`000100ff  Vec:FF  FixedDel  Ph:00000000      edg high      m
        Inti06.: 00000000`000109b2  Vec:B2  LowestDl  Lg:00000000      edg high      m
        Inti07.: 00000000`000100ff  Vec:FF  FixedDel  Ph:00000000      edg high      m
        Inti08.: 01000000`000009d2  Vec:D2  LowestDl  Lg:01000000      edg high       
        Inti09.: 01000000`0000a9b1  Vec:B1  LowestDl  Lg:01000000      lvl low        
        Inti0A.: 00000000`000100ff  Vec:FF  FixedDel  Ph:00000000      edg high      m
        Inti0B.: 00000000`000100ff  Vec:FF  FixedDel  Ph:00000000      edg high      m
        Inti0C.: 01000000`00000971  Vec:71  LowestDl  Lg:01000000      edg high       
        Inti0D.: 00000000`000100ff  Vec:FF  FixedDel  Ph:00000000      edg high      m
        Inti0E.: 01000000`00000955  Vec:55  LowestDl  Lg:01000000      edg high       
        Inti0F.: 01000000`000009b6  Vec:B6  LowestDl  Lg:01000000      edg high       
        Inti10.: 01000000`0000a956  Vec:56  LowestDl  Lg:01000000      lvl low        
        Inti11.: 01000000`0000a966  Vec:66  LowestDl  Lg:01000000      lvl low        
        Inti12.: 01000000`0000e9b7  Vec:B7  LowestDl  Lg:01000000      lvl low  rirr  
        Inti13.: 01000000`0000a976  Vec:76  LowestDl  Lg:01000000      lvl low        
        Inti14.: 00000000`000100ff  Vec:FF  FixedDel  Ph:00000000      edg high      m
        Inti15.: 00000000`000100ff  Vec:FF  FixedDel  Ph:00000000      edg high      m
        Inti16.: 00000000`000100ff  Vec:FF  FixedDel  Ph:00000000      edg high      m
        Inti17.: 00000000`000100ff  Vec:FF  FixedDel  Ph:00000000      edg high      m

Görüldüğü üzre benim makinemde *18 hat* kullanılıyor. Wiki sayfasında dikkat ederseniz 1 numaralı hattın klavyeye ait olduğunu görebilirsiniz. O hâlde 1 numaralı **IRQ**'nun **Vec**(vektör) kısmına bakıyoruz, ve *81*'i görüyoruz. Yani bu sayede **IDT** indeximizi de öğrenmiş oluyoruz. Bu konu biraz kafanızı karıştırmış olabilir fakat aslında çok basit bir temel üstüne kurulu. Sadece anlatırken çok fazla ayrıntıya girmemiz gerektiği için ayrıntılar çoğalıyor o kadar. Ha, bu yazıyı çok daha kısa da tutabilirdim hiç bu konulara girmeden direkt **IDT** kancalama yaparak fakat o zaman da temel eksik kalacaktı. (Zaten inanın çokça özet geçtik, bu uzatılmamış hali..)

Şimdi **IRQ** kısmının pratiğini de özet olarak anlattığımıza göre, öncelikle *81* indexine sahip **IDT** girdimizde gördüğümüz ve **ISR** olduğunu düşündüğümüz adrese bakalım ne var.

![](/files/interruptdispatchdallaan.png)

Fonksiyonu incelerseniz birazcık ilerlerinde `nt!KiInterruptDispatch` [fonksiyonuna](http://doxygen.reactos.org/d1/d08/irqobj_8c_source.html#l00197) dallanılıyor. Dallanmadan önce **EDI** yazmacına `84f62780` koyuluyor. Pekiyi burada ne var? Cevap az önceki çıktımızda. **81** indexindeki **IDT** çıktısına bakarsak **KINTERRUPT** yapısının bu adreste olduğunu görüyoruz. Debuggerdan bu adresteki yapının nasıl bir şey olduğunu görelim:

    kd> dt nt!_KINTERRUPT 84f62780
       +0x000 Type             : 0n22
       +0x002 Size             : 0n632
       +0x004 InterruptListEntry : _LIST_ENTRY [ 0x84f62784 - 0x84f62784 ]
       +0x00c ServiceRoutine   : 0x8b72949a  unsigned char  i8042prt!I8042KeyboardInterruptService+0
       +0x010 MessageServiceRoutine : (null) 
       +0x014 MessageIndex     : 0
       +0x018 ServiceContext   : 0x85609240 Void
       +0x01c SpinLock         : 0
       +0x020 TickCount        : 0xffffffff
       +0x024 ActualLock       : 0x85609300  -> 0
       +0x028 DispatchAddress  : 0x82a5b740     void  nt!KiInterruptDispatch+0
       +0x02c Vector           : 0x81  -->Bakın vektörmüz burda da var
       +0x030 Irql             : 0x7 ''
       +0x031 SynchronizeIrql  : 0x7 ''
       +0x032 FloatingSave     : 0 ''
       +0x033 Connected        : 0x1 ''
       +0x034 Number           : 0
       +0x038 ShareVector      : 0 ''
       +0x039 Pad              : [3]  ""
       +0x03c Mode             : 1 ( Latched )
       +0x040 Polarity         : 0 ( InterruptPolarityUnknown )
       +0x044 ServiceCount     : 0
       +0x048 DispatchCount    : 0xffffffff
       +0x050 Rsvd1            : 0
       +0x058 DispatchCode     : [135] 0x56535554

Öncelikle dikkatinizi en son eleman olan **DispatchCode** kısmına çekmek istiyorum. Lakin bu kısım aslında bizim **IDT** girdimizin **ISR** diye gösterdiği kodu işaret ediyor. Bunun dışında şu anki **IRQL, gereken IRQL** gibi önemli bilgileri de bu yapı içerisinde görebiliyorsunuz. Hani yukarıda bahsetmiştik ya, kesme nesnesi diye. İşte şu an ona bakıyorsunuz. **DispatchCode** kısmına dönersek, bu kısım kesme meydana geldiğinde çalışacak olan ilk kodu belirtiyor, yani **IDT** girdisindeki adresi. Yani şunu:

    kd> u 84f627d8 
        84f627d8 54              push    esp
        84f627d9 55              push    ebp
        84f627da 53              push    ebx
        84f627db 56              push    esi
        84f627dc 57              push    edi
        84f627dd 83ec54          sub     esp,54h
        84f627e0 8bec            mov     ebp,esp
        84f627e2 894544          mov     dword ptr [ebp+44h],eax
    kd> u 84f62780+58
        84f627d8 54              push    esp
        84f627d9 55              push    ebp
        84f627da 53              push    ebx
        84f627db 56              push    esi
        84f627dc 57              push    edi
        84f627dd 83ec54          sub     esp,54h
        84f627e0 8bec            mov     ebp,esp
        84f627e2 894544          mov     dword ptr [ebp+44h],eax

Dikkat ederseniz tıpatıp aynı olduğunu, aynı adresteki fonksiyon olduğunu görürsünüz. Buradaki ilk kod `!idt 81` çıktısından, diğeri ise 81 indexli girdinin KINTERRUPT yapısının DispatchCode elemanından. Bu kod parçası bu yapıya nerden geldi diye sorarsanız yukarıda belirttiğimiz gibi cevap: `nt!KiInterruptTemplate`. Burada bulunan kod her girdi için dinamik olarak değiştirilmekte. Değiştirilen yer de tahmin edebileceğiniz gibi **KINTERRUPT** yapısının **EDI** yazmacına alınıp, `nt!KiInterruptDispatch` fonksiyonunun çağırıldığı kısım. (Bu aşamada çağırılacak fonksiyon yapının **DispatchAddress** alanında belirtiliyor) Aşağıda gördüğünüz üstteki template olan, diğeri ise bizimki:

    kd> u nt!KiInterruptTemplate2ndDispatch l2
    nt!KiInterruptTemplate2ndDispatch:
        82a5b9b4 bf00000000      mov     edi,0
    nt!KiInterruptTemplateObject:
        82a5b9b9 e922faffff      jmp     nt!KeSynchronizeExecution (82a5b3e0)

    kd> u 84f627d8+e1 l2
        84f628b9 bf8027f684      mov     edi,84F62780h
        84f628be e97d8eaffd      jmp     nt!KiInterruptDispatch (82a5b740)

Olayı anladınız mı? Windows bu yapıyı ve içindeki **Dispatch** kodunu oluştururken gerekli şekilde düzenleyip, çağırılan kesmenin **KINTERRUPT** yapısınının adresini `mov edi, 0` kısmındaki **0** yerine koyuyor. Ardından **jmp** fonksiyonunu da `KiInterruptDispatch` a dallanacak şekilde değiştiriyor. `KiInterruptDispatch` çağırıldığında basit olarak şunlar oluyor diyebiliriz:
 
1. Spinlock elde edilir
2. IRQL değerini DEVICE_IRQL seviyesine çıkar 
3. ISR çağırılır (KINTERRUPT->ServiceRoutine)
4. Spinlock bırakılır

Spinlock nedir derseniz işletim sistemlerindeki Mutex, Critical Section, Pushlock gibi bir senkronizasyon nesnesidir dememiz bu yazı için yeterli olur sanıyorum. senkronizasyonu da kısaca şöyle anlatabiliriz, bir işlemi iki kişi yapıyor ve bu kişilere a ve b diyoruz. A, işini yaparken sırasını bekleyen B'yi bekleten şey olarak bu senkronizasyon nesnelerini düşünebilirsiniz. Şimdi konuya dönersek, örneğin aşağıda rutinin çağırıldığı kısmı görüyorsunuz:

    kd> u nt!KiInterruptDispatch l 20
    nt!KiInterruptDispatch:
        82a5b740 8bec            mov     ebp,esp
        82a5b742 8b472c          mov     eax,dword ptr [edi+2Ch] ->Vector
        82a5b745 8b4f31          mov     ecx,dword ptr [edi+31h] ->SynchronizeIrql
        82a5b748 50              push    eax
        82a5b749 83ec04          sub     esp,4 ->Eski IRQL saklanması için yer açıldı
        82a5b74c 54              push    esp
        82a5b74d 50              push    eax --->>>Vector değeri, IDT indexi oluyor kendisi
        82a5b74e 51              push    ecx --->>>SynchronizeIrql, IRQL bu değere çıkacak
        82a5b74f ff1584d0a182    call    dword ptr [nt!_imp__HalBeginSystemInterrupt (82a1d084)] ->Bu fonksiyondan çıkınca IRQL yükselmiş olacak
        82a5b755 0ac0            or      al,al
        82a5b757 0f84b0000000    je      nt!KiInterruptDispatch+0xcd (82a5b80d)
        82a5b75d 64ff05c4050000  inc     dword ptr fs:[5C4h] -->>PCR->IntteruptCount arttırıldı
        82a5b764 83ec14          sub     esp,14h
        82a5b767 f7058418b58200400000 test dword ptr [nt!PerfGlobalGroupMask+0x4 (82b51884)],4000h
        82a5b771 0f9545f4        setne   byte ptr [ebp-0Ch]
        82a5b775 0f850c010000    jne     nt!KiInterruptDispatch+0x147 (82a5b887)
        82a5b77b 33c0            xor     eax,eax
        82a5b77d 8b7724          mov     esi,dword ptr [edi+24h]
        82a5b780 f00fba2e00      lock bts dword ptr [esi],0
        82a5b785 0f82cd000000    jb      nt!KiInterruptDispatch+0x118 (82a5b858)
        82a5b78b 64ff0580360000  inc     dword ptr fs:[3680h] -->> SpinLockAcquireCount arttırıldı
        82a5b792 83f800          cmp     eax,0
        82a5b795 740e            je      nt!KiInterruptDispatch+0x65 (82a5b7a5)
        82a5b797 64ff0584360000  inc     dword ptr fs:[3684h] -->>SpinLockContentionCount
        82a5b79e 64010588360000  add     dword ptr fs:[3688h],eax
        82a5b7a5 8b4718          mov     eax,dword ptr [edi+18h] ->ServiceContext
        82a5b7a8 50              push    eax
        82a5b7a9 57              push    edi
        82a5b7aa ff570c          call    dword ptr [edi+0Ch] ------->>>>>> DIKKAT!!!

Bakın dikkat ederseniz `EDI+0C`'yi çağırıyor. Hatırlarsanız **EDI**'de bizim **KINTERRUPT** yapımız vardı. **+C** offsetine bakarsak `ServiceRoutine` alanını görüyoruz. Oranın işaret ettiği de `0x8b72949a` adresi yani `i8042prt!I8042KeyboardInterruptService`. Yani işin özeti basitçe şu ki, `KINTERRUPT` yapısına sahip olan kesmeler(donanım kesmeleri) öncelikle yapıdaki **DispatchCode** kısmından çalışmaya başlıyor, ardından **KINTERRUPT** yapısını parametre olarak `KiInterruptDispatch` fonksiyonuna verip oradan devam ediyor. Son olarak da bu fonksiyon **+C** offsetinden **ServiceRoutine** adresini alıp çalıştırıyor. Bu da bizim için şu demek oluyor, bizim kancamızı atmamız gereken yer **ServiceRoutine** kısmındaki adres. Ha, illa buraya mı atacağız tabi ki hayır. İlk gösterdiğimiz şekilde yalnızca **IDT** girdisindeki **ISR** adresine de kanca atabiliriz. Ama bu tür durumda daha kısıtlı imkanlarımız olduğunu söyleyebilirim. 

## Kancalama sürücüsünün yazılması
Öncelikle yapıyı ve mantığı öğrendiğimize göre kodumuzu yazmak için bir yol haritası çıkaralım. Yapmak istediğimiz şey **IDT** girdisindeki **ISR**'nin adresini değiştirmek değil mi? Şöyle bir yol haritamız olabilir:

1. IDT'nin adresini bul
2. Seçtiğin IDT girdisinin KINTERRUPT yapısı yardımıyla ISR'nin adresini bul ve yedekle
3. Asıl ISR adresini bizim kanca ISR adresi ile değiştir
4. Sürücü silinirken yedeklediğin ISR'yi tekrar yerine koy

Kısaca yol haritamız böyle. Oldukça basit gözüküyor değil mi? İlk adımı (ve hatta ikincisini) nerdeyse yaptık sayılır. Yazının ilk alt başlığında **IDT** ve **IDT** girdilerinin yapısını tanımlayıp, **IDT**'yi almayı da (teoride) görmüştük. Şimdi **IDT** girdisi içerisinden **ISR** adresininin iki parçasını alıp birleştiren kodumuzu yazalım.

    //IDT girdisinden ISR adresini alıp döndüren fonksiyon
    UINT32 GetISRAddress(UINT16 SID){
        //Asıl ISR adresini ve IDT girdisini tutacak değişkenler
        PIDT_DESCRIPTOR Descriptor = NULL;
        UINT32 RealISR             = 0;

        //Kancalayacağımız ISR'nin tanımlayıcısı
        Descriptor = &Idt.descriptors[SID];

        DbgPrint("BEKGISR-> Descriptor->Low        : %x \n", Descriptor->offset_low);
        DbgPrint("BEKGISR-> Descriptor->GateType   : %x \n", Descriptor->d_Type);
        DbgPrint("BEKGISR-> Descriptor->DPL        : %x \n", Descriptor->DPL);
        DbgPrint("BEKGISR-> Descriptor->P          : %x \n", Descriptor->P);
        DbgPrint("BEKGISR-> Descriptor->High       : %x \n", Descriptor->offset_high);

        //IDT girdisinden ISR adres bilgimizi alıp birleştiriyoruz
        //RealISR degiskeninde ornek degisme -> 82a5 -> 82a50000 -> 82a5e22e
        RealISR = Descriptor->offset_high;      
        RealISR = RealISR << 16;             
        RealISR = RealISR | Descriptor->offset_low;  
        
        return RealISR;
    }

Yazdığımız bu fonksiyon parametre olarak girdi indexini alıyor. Ardından belirttiğimiz index'deki girdinin adresini **Descriptor** değişkenine koyuyor. Bu değişkenin bir gösterici olduğuna dikkat edin (**PIDT_DESCRIPTOR**). Sonra **C**'nin müthiş yeteneklerini kullanarak girdinin bilgilerini ekrana(daha doğrusu DebugView ekranına/Windbg ekranına) yazdırıyor. Ardından **offset_high** ve **offset_low** alanlarını birleştirerek **ISR**'nin gerçek adresini buluyor. Birleştirme sırasında sola kaydırma bit operatörünün kullanımına dikkat edin. Sola kaydırma yaptığım için sağdan itibaren **0** ile dolduruyoruz. Son olarak da bulduğumuz bu adresi döndürüyoruz. Bu adresi birazdan KINTERRUPT yapısına ulaşmak için kullanacağız. Bu sebeple sürücümüzün ana dosyasını da burada görmemiz iyi bir fikir olacak:

    #include "bekidt.h"

    //Sürücünün silinmesi sırasında çalışacak olan fonksiyon
    void Unload(PDRIVER_OBJECT pDriverObject){
        //Bu defa kanca fonksiyonu asılı ile değiştiriyoruz
        __asm cli
        PKINT->ServiceRoutine = oldRoutine;
        __asm sti
        DbgPrint("BEKUNLD-> Driver kaldirildi. \n");
    }

    //Sürücü yüklendiğinde çalışacak olan fonksiyon
    NTSTATUS DriverEntry(PDRIVER_OBJECT pDriverObject, PUNICODE_STRING pRegistryPath){
        //Unload fonksiyonu tanımlanması ve ISR adresini tutacak değişken
        UINT32 IsrAdress;
        pDriverObject->DriverUnload = Unload;

        //SIDT komutu ile IDTR yazmacının içeriğini Idt global değişkenine alıyoruz
        __asm sidt Idt;

        //Yazmacın içeriğini de görelim
        DbgPrint("BEKMAIN-> IDT.Descriptors        : %x \n", Idt.descriptors);
        DbgPrint("BEKMAIN-> IDT.Limit              : %x \n", Idt.limit);

        //IDT Girdisindeki adresi alalım bakalım..
        IsrAdress = GetISRAddress(KEYBOARD_VECTOR);
        
        DbgPrint("BEKMAIN-> IDT girdisindeki Dispatch adresi: %x \n", IsrAdress);

        //Aldığımız ISR adresi KINTERRUPT->DispatchCode gösteriyordu
        //o halde -(eksi) 58 yaptığımızda yapının başına geliriz
        PKINT = (PKINTERRUPT)(IsrAdress - 0x58);
        
        //Önce kesmeleri kapatıyoruz
        __asm cli
        //Gerçek ISR adresini yedekleyelim
        oldRoutine = PKINT->ServiceRoutine;
        //Kanca ISR adresini yeni adres yapalım
        PKINT->ServiceRoutine = HookRoutine;
        //Kesmeleri tekrar açıyoruz
        __asm sti

        DbgPrint("BEKMAIN-> Yedeklenen ISR girdisi adresi: %x \n", oldRoutine);

        return STATUS_SUCCESS;
    }

Burada öncelikle `__asm sidt Idt` ile **IDTR** yazmacının içeriğini tanımladığımız **Idt** değişkenine alıyoruz. Ardından dikkat ederseniz `GetISRAddress` fonksiyonunu **IDT**'deki dispatch kodunun adresini  **IsrAdress** değişkenine almak için kullanıyoruz. Kullandığımız index kodu 81. Üstteki bilgilerimizden nereye ait olduğunu biliyorsunuz. Tekrar bakarsak:

    kd> !idt 81
      Dumping IDT: 80b95400
      00000081:   853347d8 i8042prt!I8042KeyboardInterruptService (KINTERRUPT 85334780)

`I8042KeyboardInterruptService` imiş bildiğiniz üzre. Pekiyi bu arkadaş nedir? Şu anda bastığım her tuş için çağırılan kesmedir. Evet, hâlâ o kesme çağırılıyor şu an eehheh. Bu durum hemen aklınıza bir katakulli getirebilir. O da nedir? Şudur: her tuşa bastığımda bu kesme çağırılıyorsa, demek ki bastığım tuş bilgisine de bu kesme yardımıyla ulaşabilirim, belki de bunu kötü amaçlar için kullanabilirim. Bildiğiniz keylogger yazımı için kullanabilirsiniz yani. Tabi bunun başka birçok yöntemi daha da var fakat konumuz bu değil. Ayrıca burada anlattıklarımı birileri okuyup da kendi zararlısını yazsın diye anlatmıyorum. O nedenle lütfen burada öğrendiklerinizi can yakmak için kullanmayın. ([Hatırlatma..](https://www.youtube.com/watch?v=T-OgMoIgm0I)) Neyse, konuya dönelim. Ben bu kesmeyi seçtim lakin sürekli çağırıldığı için hem kancamızı test etmemiz de çok kolay olacak hem de konunun ciddiyetini güzel örnekleyecek. Bu kesmeden başka sürekli çağırılan kesmeler de var tabi, dedim ya **IDT** girdilerinde bi gezinmenizi tavsiye ediyorum..

Ardından basit bir matematik kullanıp **KINTERRUPT** yapımıza ulaşıyoruz. (Kodda açıklamayı görüyorsunuz) Hemen ardından önce kesmeleri kapatıyoruz ardından öncelikle asıl **ISR** adresini `PKINT->ServiceRoutine` içerisinden alıp **oldRoutine** değişkenine koyuyoruz. Sonra da bu alanı kanca fonksiyonumuzun adresi ile dolduruyoruz. Böylece kancamızı atmış oluyoruz. Bu arada unutmadan, **PKINT** ve **Idt** ve diğerdeğişkenlerimiz başlık dosyamızda tanımlı :

    IDT Idt;
    PVOID oldRoutine;
    PKINTERRUPT PKINT = NULL;
    #define KEYBOARD_VECTOR 0x81

Şimdi tekrar kaynak kodumuza bakarsanız(link aşağıda olacak) içerisinde **HookISR** fonksiyonu olduğunu göreceksiniz. Bu fonksiyonu dileyen dostlarımız test amaçlı kullanabilir. Kendisinin yaptığı şey **IDT** girdisindeki **ISR** adresini değiştirmek. Yani bu fonksiyon bizimkinden farklı olarak yalnızca **IDT** girdisindeki **ISR** adresini değiştiriyor. Biz **KINTERRUPT** yapısındaki adresi değiştirdiğimiz için bunu kodumuzda kullanmayacağiz fakat ilgilenen arkadaşlar için örnek olması açısından kodlara dahil ettim. (Doğrusu en başta yazıyı sadece **IDT** girdisindeki adrese kanca atmak olarak yazmıştım, sonradan biraz daha ayrıntılı olmasına karar verince o da kalsın istedim)

    //IDT girdisindeki ISR adresini kanca ISR ile değiştiren fonksiyon
    void HookISR(UINT16 SID, UINT32 HookISRAddress){
        //Kancalanacak girdiyi, kanca ISR'nin düşük ve yüksek 16 bitini tutan değişkenler
        UINT16 hook_low;
        UINT16 hook_high;
        PIDT_DESCRIPTOR ToHook = NULL;

        //Kanca ISR adresinin ayrıştırılması yapılıyor
        hook_low  = (UINT16)HookISRAddress;          //b19c
        hook_high = (UINT16)(HookISRAddress >> 16);  //9b6f

        //Yeni ISR adresinin yüksek ve düşük öncelikli alanlarını da ekrana yazalım
        DbgPrint("BEKHOOK-> NewAddr->High          : %x \n", hook_high);
        DbgPrint("BEKHOOK-> NewAddr->Low           : %x \n", hook_low);

        //Kancalanacak IDT girdisinin adresini yapısal olarak alıyoruz
        ToHook = &Idt.descriptors[SID];

        //Öncelikle kesmeleri kapatıyoruz
        __asm cli
        //Kancayı atıyoruz
        ToHook->offset_low  = hook_low;
        ToHook->offset_high = hook_high;
        //Kesmeleri tekrar açıyoruz
        __asm sti

        return;
    }

**HookISR** fonksiyonu gördüğünüz gibi iki parametre alıyor: biri index değeri diğeri ise kanca ISR'nin adresi. Fonksiyona girildikten sonra kanca adresin ayrıştırılmasını gerçekleştiriyoruz. Ardından kancalanacak olan girdiyi **ToHook** değişkenine alıyoruz. Son olarak ise kancalamayı gerçekleştiriyoruz. Bunu yaparken öncelikle `cli` komutu ile kesmeleri kapatıyoruz böylece işlemimiz bir kesme ile kesilmeden tek seferde gerçekleşiyor. Ardından bulduğumuz IDT girdisindeki ISR'nin **offset_low** ve **offset_high** alanlarını yenileri ile güncelleyip `sti` komutu ile tekrar kesmeleri açıyoruz. Dediğim gibi bu kısmı kodlarımızda kullanmıyoruz sadece örnek olması açısından kodlara dahil ettim. Şimdi devam edelim.

Bakıyorum... Kodlarda incelemediğimiz sadece kanca ISR kaldı onu da görelim:

    //Kanca ISR'mizin çağıracağı minik fonksiyon
    void Logla(void){
        DbgPrint("BEKLOGL->  Klavye tusuna basildi! \n");
    }

    //Kanca ISR
    void __declspec(naked) HookRoutine(){
        __asm{
            pushad;       //push EAX, ECX, EDX, EBX, EBP, ESP, ESI, EDI
            pushfd;       //push EFLAGS
            push fs;      //push fs
            mov bx, 0x30;
            mov fs, bx;   //fs 0x30 selektörüne ayarlandı

            //Yapacağımızı burada yapıyoruz
            call Logla;

            pop fs;       //fs önceki değere alındı
            popfd;        //Yazmaçlar ve EFLAGS önceki değerlerine alındı
            popad;

            //Asıl ISR'yi çağırıyoruz
            jmp oldISRAddress;
        }
    }

Kanca ISR'nin **naked** olarak tanımlanmış olmasına dikkat edin. Bu sayede derleyiciye özetle "karışma, bende." diyoruz. Yani derleyici bu fonksiyonun başına veya sonuna başka bir kod eklemiyor. `__asm` bloğunun içine ne yazdıysak o. Bunu belirtmezsek derleyici kodun içerisine bizim istemediğimiz *prologue* ve *epilogue* kısımlarını da ekleyecek(önceki yazılardan birinde bahsetmiştim). Bloğun içine baktığımızda yine oldukça basit. Öncelikle yazmaçlarımızı yedekliyoruz, ardından **FS** yazmacını `0x30`'a ayarlıyoruz. Sonrasında **Logla** fonksiyonumuzu çağırıyoruz. Bu fonksiyonun yaptığı tek şey çağırıldığı zaman *DebugView* ekranına klavyeye basıldığını söyleyen bir mesaj bırakmak. Tabi bunun yerine çok daha değişik şeyler de olabilir. Zararlı veya yararlı şeyler.. Neyse, fonksiyondan döndükten sonra ise **FS**'yi eski değerine çekiyor(ki muhtemelen yine `0x30` çünkü kernel moddayız) ve asıl ISR adresine dallanıyoruz.

Bu arada neden `0x30` sorusu güzel bir soru. Ben de bunu sordum fakat internette aklıma yatan bir cevap aradımsa da bulamadım. Haliyle iş başa düştü ve birazcık kurcalamak gerekti. Windbg kullanarak hem user modda hem de kernel modda **FS** yazmacını okuyunca farklı selektörlere işaret ettiğini görüyorsunuz. User moddayken **FS**'in [TEB](https://msdn.microsoft.com/en-us/library/windows/desktop/ms686708(v=vs.85).aspx)(Thread Environment Block)'e işaret ettiğini önceden biliyordum. (Aslında TEB'in başındaki NtTib yapısına işaret ediyor, Tüm yapı -> [nt!\_TEB](http://www.nirsoft.net/kernel_struct/vista/TEB.html)) Ama kernel modda **FS** aynı yere işaret etmiyordu. Bakınız:

    0:001> dg fs
                                      P Si Gr Pr Lo
        Sel    Base     Limit     Type    l ze an es ng Flags
        ---- -------- -------- ---------- - -- -- -- -- --------
        003B 7ffdd000 00000fff Data RW Ac 3 Bg By P  Nl 000004f3
    0:001> r $teb
        $teb=7ffdd000

Gördüğünüz gibi user modda **FS** yazmacındaki selektör bize **TEB**'i veriyor. (Selektör `3b` dikkat) Pekiyi ya kernel mod? Bakınız:

    kd> dg fs
                                      P Si Gr Pr Lo
        Sel    Base     Limit     Type    l ze an es ng Flags
        ---- -------- -------- ---------- - -- -- -- -- --------
        0030 82b79c00 00003748 Data RW Ac 0 Bg By P  Nl 00000493
    kd> ln 82b79c00 
    (82b79c00)   nt!KiInitialPCR   |  (82b7d380)   nt!KiCacheFlushTimeStamp
    Exact matches:
        nt!KiInitialPCR = <no type information>

Gördüğünüz gibi bu defa selektör numaramız **30**. `ln`(list nearest symbols) kullanarak yakınlarda bir yerde bir sembol arayınca karşımıza `nt!KiInitialPCR` çıkıyor. Aha! [PCR](https://en.wikipedia.org/wiki/Processor_Control_Region)'yi görünce hemen akla **Processor Control Region** gelmesi gerek. *PCR* dediğimiz şey kernel modda kullanılan, aktif işlemci hakkında çok güzel bilgiler veren bir veri yapısıdır. ([nt!\_KPCR](http://www.nirsoft.net/kernel_struct/vista/KPCR.html)) Demek ki neymiş? Kernel modda **FS** PCR'yi gösteriyormuş. Ben kendi kernel mod denemelerimde FS'yi hep 30 olarak gördüm. Ama incelediğim kodların çoğunda yine de **FS** 30 yapılıyordu, sanıyorum sağlamlık açısından. Ayrıca neden bu değerler ayarlanıyor diye sorarsanız çünkü sistemdeki fonksiyonlar vesaire **FS** yazmacı üzerinden bu yapılara erişerek işlem yapıyorlar. Hâliyle hem user modda hem de kernel modda gerektiğinde ulaşabilmeleri için **FS** yazmacı doğru yeri göstermeli. Yeri gelmişken `!pcr 0` komutu ile **0**. işlemcinin PCR'si hakkında bilgi alabilirsiniz. Vaktiniz varsa kesinlikle bakmanızı tavsiye ederim (hatta direkt `dt nt!_KPCR ADRES` şeklinde bakın) çünkü IDT, GDT, [PCRB](https://en.wikipedia.org/wiki/Process_control_block) ve sayamayacağım kadar şey bu yapı sayesinde ulaşılabilir. Kernel modda geliştirme yaparken eminim ki çok işe yarayabilir. Bu işin bu yanını çok seviyorum. Sahiden her şey çorap söküğü gibi. Tek bir yapıdan öyle çok yere ulaşıyorsunuz ki..

Ayrıca yukarıdaki Windbg çıktıları ile ilgili öğrendiğim hoş bir ayrıntı vereyim.. İlk çıktı kullanıcı tarafındaki debuggerdan. Komut satırı `0:001>` şeklinde. 1 yani 1. thread. Baştaki 0 da bildiğim kadarıyla kaçıncı target olduğunu gösteriyor. (Evet, tek debugger ile birdan fazla makineyi debug etmek mümkün) Diğer çıktıda ise komut satırında `kd>` görüyorsunuz. Yani çekirdek modunda debugging yapıyoruz..

Şimdi konumuza devam edelim.. Nerde kalmıştık ? Hah! Kanca **ISR** fonksiyonumuzu incelemiştik. Sanırım kodlarda incelenecek bir kısım kalmadı. <del>Yukarıda açıklamasını yaptığımız kodları şuradan temin edebilirsiniz</del>(Kodların kötüye kullanımını engellemek amacıyla kaynak kodları kaldırdım, görmek isteyenler lütfen mail ile ulaşşsınlar.). Şimdi ise sıra test etmeye geldi.

## Sürücünün test edilmesi
Teorik olarak sürücümüzü derleyip *OSRLoader* yardımıyla sisteme yükleyip başlattıktan sonra bastığımız her klavye tutşunda DebugView ekranına bir girdinin düşmesi gerekiyor. Öncelikle sürücüyü başlattığımızda durumu görelim:

![](/files/bekidtyuklendi.png)

Görebildiğiniz üzre her şey gayet yolunda gözüküyor. Asıl **ISR** girdisini `8b72949a` olarak görüyorsunuz. NewAddr->High + NewAddr->Low birleşimi yaparsanız **IDT** girdisinde olan Dispatch kodunun da `84f627d8` olduğunu görebilirsiniz. `!idt 81` yaparak kancamızın yerleştiğini doğrulayabiliriz:

    kd> !idt 81
    Dumping IDT: 80b95400
        00000081:   84f627d8 bekidt!HookRoutine (KINTERRUPT 84f62780)
    kd> dt nt!_KINTERRUPT ServiceRoutine 84f62780
       +0x00c ServiceRoutine : 0x968fe152     unsigned char  bekidt!HookRoutine+0

Son olarak sürücü aktif durumdayken klavyede herhangi bir tuşa basarak attığımız kancayı test edelim:

![](/files/bekidtahatusabasti.png)

Yine gördüğünüz gibi.. Tuşa bastığımızda önce bizim ISR'mız çalıştı ve basıldığına dair mesajı bize verdi.. IDT kancalamanın temeli aşağı yukarı bu şekilde..  Son olarak başta dediğimiz gibi eğer işlemci sayısı birden fazlaysa buna göre de birden fazla IDT tablosu oluyor. Yani her işlemcinin kendi IDT tablosu oluyor. Genel olarak bu tablolar hep aynı rutinleri gösterir fakat örneğin siz  1. işlemcide 4 numaralı kesmeyi kancaladınız eğer 2. işlemcide 4 numaları kesme çağırılırsa sizin kanca ISRniz çağırılmaz çünkü siz sadece 1. işlemciyi kancaladınız. Bu durumda yapmamız gereken şey gayet basit: diğer işlemcilerin IDT tablolarını da kancalamak! Ben yazıda sanal makine üzerinde tek işlemci kullandığım için bunu göstermeyeceğim, fakat talep olursa yazıyı çoklu işlemci için güncelleyebilirim.

Bir yazının daha sonuna geldik. Kodları elimden geldiğince minik, bol yorumlu ve anlaşılır tutmaya çalıştım, anlaşılmayan kısımlar için biliyorsunuz aşağıda yorum atılabilen bir bölüm var.. Bu temel üzerinden yürüyerek birçok şey yapılabilir hem iyi anlamda hem de kötü anlamda. Umarım yapacağınız şeyler iyi anlamda olur. Son olarak yazıyı yazarken 2 gün bi kesintili yazmak zorunda kaldım atladığım bir ayrıntı, hata olabilir, yakalayanlar lütfen bildirsin gereken düzenlemeyi yapayım..

Sevgiler.

---
* Windows Internals 6
* [phrack #65->4](http://phrack.org/issues/65/4.html)
* Yazarken dinlediğim [1](https://www.youtube.com/watch?v=padvnsLUhUM), [2](https://www.youtube.com/watch?v=xncGRhKY0K4), [3](https://www.youtube.com/watch?v=c3etD3dmTXo)
* [Servicing Interrupts MSDN](https://msdn.microsoft.com/en-us/library/windows/hardware/ff563737(v=vs.85).aspx)
* [Hooking software interrupt](http://www.woodmann.com/yates/SystemHooking/hooksoft.htm)
* [Inside NT's Interrupt Handling](http://windowsitpro.com/systems-management/inside-nts-interrupt-handling)
* [Deferred Procedure Call Details - OSR ](https://www.osronline.com/article.cfm?article=529)
