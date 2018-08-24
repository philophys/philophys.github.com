---
layout: post
title: İşletim Sistemlerinde Kesme ve İstisna Yönetimi
categories: Bilgisayar
---

Merhabalar

Bu defa öğreneceğimiz konu işletim sistemlerindeki *Kesme*(Interrupt) ve *İstisna*(Exception) yönetimi. Gerçekten önemli bir konu, bende anlayabildiğim kadarıyla sizlere göstermeye çalışacağım. Şimdi kesme ve istisna yönetimine girmeden önce *kapılar*(gates)'dan biraz bahsetmem gerekecek. Kapılar basit olarak ayrıcalık seviyesi farklı olan segmentlerin birbirleriyle iletişim haline geçebilmesini sağlayan yapılardır. Buna en basit örnek, işletim sistemindeki düşük seviyeli fonksiyonların üst seviyelerdeki bir program tarafından ihtiyaç duyulması gösterilebilir, bu durumda üst seviyedeki program alt seviyede bulunan sistem fonksiyonunu çağırmak durumunda kalacaktır. İşte biz bu tür bir çağırmayı kapılar yoluyla yapabilmekteyiz. Program işletim sistemi tarafından hazırlanmış özel kapıları kullanarak diğer seviyeye atlayabilir. *4* tür kapı bulunmaktadır, bunlar:

1. Çağırma Kapıları ( *Call Gates* )
2. Yazılım Kesme Kapıları ( *Tuzak* )   ( *Trap Gates* )
3. Kesme Kapıları   ( *Interrupt Gates* )
4. Görev Kapıları   ( *Task Gates* )

*Çağırma kapıları* `call` veya `jmp` makine komutlarıyla gerçekleştirilir. *Kesme, yazılım kesme kapıları* ise `INT` komutu veyahut donanım kesmeleri yardımıyla gerçekleşir. *Görev kapıları* ise saydıklarımızın hepsi ile gerçekleşebilir. 4 kapı tanımlıyıcısıda benzer bir yapıya sahiptir. Peki kapılar koruma mekanizmasından nasıl etkileniyor ? Tanımlayıcıdaki DPL ne için olabilir ? Evet, kapılar kullanılınırkende bazı koruma işlemleri gerçekleştirilmektedir. Bu koruma işlemlerini kısaca şöyle anlatabiliriz.

**1-)** Kapının **DPL** değeri ile çalışan kodun **CPL** değeri  ve kapıya ait **RPL** değeri karşılaştırılır. *CPL* ve *RPL*'nin düşük öncelikli olanı DPL'den küçük veya eşitse erişime izin verilir. Aksi taktirde **Genel Koruma Hatası**.

**2-)** İkinci koruma kontrolü ise kapıdaki selektörün **DPL** değeri ile çalışam kodun **CPL** değeri karşılaştırılır. Eğer *CPL* *DPL*'den daha düşük öncelikli yada eşitse erişime onay verilir, aksi taktirde yine **Genel Koruma Hatası**.

Bunlar dışında da bazı tür ve limit kontolleri yapılmaktadır. Bu kontrollerin geçememesi yine koruma hatasına yol açar. Peki hangi tanımlayıcının hangi segmentin hangi kapı olduğunu nasıl anlarız ? Önceki yazılardan hatırlayacağınız üzere tanımlayıcının **S** biti **0** ise segment sistem segmenti oluyordu. Sistem segmenti olduktan sonra segmentin **Tip Sahası** segmentin ne olduğuna ilişkin bilgiyi veriyor bize. Hemen bir tabloda görelim.

    | 0 | 0 | 0 | 0 | Ayrılmış
    | 0 | 0 | 0 | 1 | 16 Bit TSS
    | 0 | 0 | 1 | 0 | LDT
    | 0 | 0 | 1 | 1 | 16 Bit TSS ( Meşgul )
    | 0 | 1 | 0 | 0 | 16 Bit Çağırma Kapısı
    | 0 | 1 | 0 | 1 | Görev Kapısı
    | 0 | 1 | 1 | 0 | 16 Bit Kesme Kapısı
    | 0 | 1 | 1 | 1 | 16 Bit Y. Kesme (Tuzak) Kapısı 
    | 1 | 0 | 0 | 0 | Ayrılmış
    | 1 | 0 | 0 | 1 | 32 Bit TSS
    | 1 | 0 | 1 | 0 | Ayrılmış
    | 1 | 0 | 1 | 1 | 32 Bit TSS ( Meşgul )
    | 1 | 1 | 0 | 0 | 32 Bit Çağırma Kapısı
    | 1 | 1 | 0 | 1 | Ayrılmış
    | 1 | 1 | 1 | 0 | 32 Bit Kesme Kapısı
    | 1 | 1 | 1 | 1 | 32 Bit Y. Kesme(Tuzak) Kapısı

Şimdi 32 bit kapılar hakkında kısa bir bilgi edinelim.

## Çağırma Kapıları
Çağırma kapıları **GDT** veya **LDT**'de bulunabilir. Farklı ayrıcalık seviyesindeki programların birbirlerinin kodlarına erişimini sağlar. Çağırma kapıları **16** veya **32** bit olabilir. Şimdiki sistemlerde *32* bir kapılar kullanılmaktadır, *16* bit kapılar **80286** işlemcilerinde kullanmaktaydı. Çağırma kapıların yapısı aşağıdaki gibidir.

![](/files/callgatestruct.png)

Görülebileceği üzere kapı tanımlayıcıları da **64** bittir. Şimdi çağırma kapısı tanımlayıcısındaki bölümleri inceleyelim.

**Segment Selektör :** Atlanılacak segmente ait selektör.

**Segmentteki Offset :** Dallanmanın yapılacağı segmentin offset değeri. Bu iki yapı ile atlanacak sektör şöyle bulunur : `Atlanacak Yer = Segment Selektörü:Segmentteki Offset`

**Count :** Çağıran programın stack bölgesinden kaç tane 32 bitlik bilgi kopyalanacağını gösterir.

**S :** Kapı olduğundan **0** olmak zorundadır.

**Type :** 1 1 0 0 olmak zorunda. ( Çağırma Kapısı )

**DPL :** Çağırma kapısının *DPL* değeri. 

**P :** Çağırma kapısı segmentinin hafızada olup olmadığını belirtir.

## Kesme Kapıları
Kesme kapıları çağırım kapılarına yapı olarak çok benzemektedir. Yalnızca kesme kapılarında *Tip* kısmı `1 1 1 0` ve *COUNT* kısmı *Reserved* durumundadır.

## Tuzak Kapıları
Tuzak kapıları yapı olarak kesme kapıları ile aynıdır, yalnızca tip bölümü `1 1 1 1` şeklindedir. Fakat aralarında bir fark bulunur, ikiside **EFLAGS** yazmacındaki **IF** bayrağını farklı şekilde işler. Kesme kapısı EFLAGS yazmacı yığına atıldıktan sonra IF bayrağını sıfırlar. Bu sayede kesme kapısındayken bir donanım kesmesi gelemez, tuzak kapısı ise **IF** bayrağını sıfırlamaz, yani bir kesme oluşabilir.

Görev kapıların incelenmesi biraz daha farklı bir konuya gireceği için onu sonraki yazılardan birine bırakıyorum. Şimdilik yapı olarak benzer olduklarını bilin, birde görev kapılarının tip bölümü **0 1 0 1** şeklindedir.

## Kesme ve İstisnaların Yönetimi
Şimdi geldi bu istisna ve kesmelerin yönetimine, anlatım sonunda eğer hâlim kalırsa birde örnek kod göstererek anlaşılabilirliği arttırmayı düşünüyorum, yada belki de düşürür neyse. Donanım kesmeleri bir programın çalışması sırasında donanımlardan gelen bir sinyal ile meydana gelebilmektedir. İstisnalar ise işlemci tarafından çalıştırılan bir kodun, çalışma sırasında karşılaştığı sorunlar için çağırdığı kesmelerdir. Kesmelerde kendi içlerinde bazı başlıklara ayrılabilir. Örneğin bir yazılım tarafından oluşturulan kesmelere *Tuzak(Trap)* kesmesi denir. Bu kesmeler meydana geldiğinde **EFLAGS**, **CS** ve **EIP** yazmaçları yığına atılır. Aygıt segment taşması veya çifte hata gibi sorunları doğuran kesmelere *Bozulma(Abort)* kesmesi denir, bu tür bir sorun oluştuğunda kaçarı yoktur, görev sonlandırılır. 0'a bölme, geçersiz makina komutu, Genel koruma hatası gibi sorunlara sebep olan kesmelere de *Hata(Fault)* kesmesi denir, Hata kesmesi oluştuğunda oluşan hatanın bildirilmesi için *EFLSGS, CS, EIP* dışında bir de **hata kodu** da yığına atılır. Fakat hata kodu **IRET** komutu işletildiğinde yığından geri gelmez, programcı tarafından alınıp ardından *IRET* komutunun çalıştırılması gerekir. Bu hata kodu ile ilgili birazdan mini bir inceleme yapacağız. 

İşlemci bu kesme ve istisnaları bir tablo içerisinde tutmaktadır. Bu tabloya **Interrupt Descriptor Table** (IDT) denilmektedir. IDT *256* adet tanımlayıcı içermektedir. Her tanımlayıcı **8 byte** büyüklüğe sahiptir. GDT'nin aksine IDT'nin ilk değeri *null* değildir. **IDT**'ye erişim **IDTR** yazmacı ile gerçekleşmektedir.  *IDTR* 32 bit taban adresi ile 16 bit uzunluk değeri tutmaktadır. Taban adresi anlayabileceğiniz üzere IDT'nin **taban adresini**, limit değeri ise LDT tablosunun **uzunluğunu** göstermektedir. Herhangi bir kesme oluştuğunda kesme numarısı *8* (sizeof(struct idt_entry)) (64 Bit) ile çarpılır ve *IDT*'den tanımlayıcıya ulaşılır ve orada bulunan tanımlayıcı ile kesme yöneticisinin adresi elde edilir.

![](/files/idtrveidtiliskisi.png)

### Önceden belirlenmiş kesmeler
Intel işlemcilerde önceden belirlenmiş bazı istisnalar vardır. *IDT[256]*'nın ilk **32** elemanı istisnalara ayrılmış durumdadır. Geri kalan elemanlar donanım ve yazılım kesmelerine ayrılmıştır. Önceden belirlenen istisnalar aşağıdaki gibidir. Bu istisnaların 

    1.Kesme     Divide Error (Hata)
    2.Kesme     Debug exception (Hata/Tuzak)
    3.Kesme     NMI Interrupt (Donanım)
    4.Kesme     Breakpoint (Tuzak)
    5.Kesme     INTO Detected Overflow (Tuzak)
    6.Kesme     BOUND Range Exceeded (Hata)
    7.Kesme     Invalid Opcode (Hata)
    8.Kesme     Coprocessor not available (Hata)
    9.Kesme     Double exception (Bozulma)
    10.Kesme    Coprocessor segment overrun (Bozulma)
    11.Kesme    Invalid Task State Segment (Hata)
    12.Kesme    Segment not present (Hata)
    13.Kesme    Stack Fault Exception (Hata)
    14.Kesme    General Protection Exception (Hata)
    15.Kesme    Page Fault Exception (Hata)
    16.Kesme    Rezerve Edilmiş 
    17.Kesme    Floating Point Error (Hata)
    18–32.Kesme Rezerve Edilmiş 

## Hata Kodları
Hata kodlarının hata kesmeleri oluştuğunda yığına atıldığından bahsetmiştim. Hata kodlarının genel yapısı şu şekildedir.

![](/files/hatakodlari.png)

Selektör indexi hatanın oluştuğu selektörü belirlemek için kullanılır, bu sayede kesme kodu bu selektörü kullanıp hata kodunu inceler. **EXT** biti kesmeye neden olan durumun programla ilgili olup(0) olmadığına(1) göre değişir. *IDT* ve *TI* bitleri selektör indexinin hangi tabloda olduğunu belirtir.

## Kesme yönetiminde Stack Değişimi
İşlemci ayrıcalık düzeyi aynı olan bir kesme ile karşılaşırsa *EFLAGS,CS* ve *EIP* yazmaçlarını yığıt(stack)da saklar. Eğer kesme sonucunda bir hata kodu dönerse oda yığında saklanır. Peki ya ayrıcalık düzeyleri farklı olursa ne olur ? İşte o zaman bir stack problemi ortaya çıkar, çağıran fonksiyonun stack bölgesi düşük seviyede kalırsa oluşan stack problemi tüm sistemi olumsuz etkileyebilir. Ayrıca stack bölgesi düşük seviyede kalırsa başka düşük seviyeli programlarda bu stack bölgesine erişecektir, çağıran fonksiyona geri dönüş adreside yığında tutulduğu için bu bir güvenlik problemi haline dönüşecektir. Bu duruma çözüm olarak kapılar ile yüksek seviye bir kod çağırıldığında stack bölgeside o seviyeye geçici olarak taşınır.

## Örnek bir Kesme Yönetimi
Şimdi yalnızca sıfıra bölme istisnasını bir örnek üzerinde gösterelim. 
Öncelikle kulanılan yapıları görelim.

    struct idt_entry {
        unsigned short base_low;  /* Base 0-15 */
        unsigned short base_high; /* Base 24-31 */
        unsigned short sel;       /* Segment Selektörü 0-15 */
        unsigned char zero;       /* Hep sıfır */
        unsigned char flags;      /* İzinler */
    } __attribute__((packed));

    struct idt_ptr {
        unsigned short limit;     /* IDT'nin Uzunluğu */
        unsigned long base;       /* IDT'nin Taban Adresi */
    } __attribute__((packed));

Bu yapı üzerine bir **IDT** oluşturulup **IDT pointerın** değer atamaları gerçekleştirilsin,

    struct idt_entry Cayidt[256];  /* IDT */
    struct idt_ptr   Cayidtp;      /* IDT Pointer */ 

    Cayidtp.limit = (sizeof(struct idt_entry) * 256) - 1;
    Cayidtp.base = (unsigned long)&Cayidt;

Şimdi **lidt** makine komutu ile **IDT** yükleniyor.

    _idt_load();

    /*
    global _idt_load
    extern Cayidtp
    _idt_load:
        lidt [Cayidtp]
        ret
    */
Ardından bu IDT tablosuna girdi eklemek için kullanacağımız **IDT\_Gate\_Set** fonksiyonu tanımlansın.

    void IDT_Gate_Set(unsigned char num,
                  void (*base)(void), /* Dikkat Function Pointer */
                  unsigned short sel,
                  unsigned char flags) {
        Cayidt[num].base_low  = ((unsigned long)base & 0xFFFF);
        Cayidt[num].base_high = ((unsigned long)base >> 16) & 0xFFFF;
        Cayidt[num].sel       = sel; /* Selektör */
        Cayidt[num].zero      = 0;
        Cayidt[num].flags     = flags | 0x60; /* 0x60 -> DPL 3 */
    }

Ardından *IDT\_Gate\_Set* fonksiyonuyla sıfıra bölme istisnasının *IDT*'ye yerleştirilmesi aşağıdaki şekilde yapılmaktadır.

    IDT_Gate_Set(0, DivideError, 0x08, 0x8E);

Son verilen argüman erişim izinleri ile ilgilidir. Dikkat ettiyseniz kapıyı dolduran fonksiyon ikinci parametreyi bir fonksiyon göstericisi olarak almaktaydı, bizde burada ikinci parametreyi fonksiyon olarak veriyoruz. Ayrıca her zaman sıfır olması gereken bölüm için ek bir parametre almıyor, fonksiyon içerisinde **0** değerinini veriyoruz. Burada bahsettiğimiz **DivideError** fonksiyonu assembly dilinde şu şekilde yazılmıştır.

    DivideError:
             push DWORD 0 //İstisna numarası yığına atılıyor
             jmp MainHandler

Burada *MainHandler* istisnaları yöneten ana fonksiyondur. Uzun olduğundan onu burada yayınlamayacağım, merak eden arkadaşlar yorumlardan bildirirse kaynak kodun tamamını alabilir. Kısaca yığına atılan istisna numarasını ve o anki yazmaçların durumlarını ekrana yazdıran bir C/Assembly kodunu çağıran yardımcı bir fonksiyondur diyebiliriz. 

Ayrıca küçük ve güzel bir ipucu vereyim, işletim sistemlerinde sistem çağrılarıda bir kesme tarafından yapılır. Örneğin Linux işletim sistemi çekirdeğinde *80h (0x80)* kesme numarası sistem çağrıları için ayrılmıştır. Örneğin **53** numaralı kesmeyi sistem çağrı kesmesi olarak ayarlamak için *IDT*'ye şöyle bir ekleme yapabiliriz.

    IDT_Gate_Set(53, Cayux_Sys_Call_ASM, 0x08, 0x8E);

Bu şekilde **53h** numaralı kesme çağırıldığında **Cayux_Sys_Call_ASM** fonksiyonu çağırılır. Tabi bu kesmeye kuru kuru çağırmak pek bir işe yaramaz. Onu çağıran ayrı bir fonksiyon bulunmalıdır. Aslında bu kadarla sistem çağrılarını anlamak biraz zor, şöyle diyeyim sistem çağrılarının tutulduğu bir sistem çağrı listesi vardır, sistem çağrılarının kullandığı fonksiyonların adresleri bu listede tutulur. Örneğin **1** numaralı sistem çağrısı *exit()* fonksiyonu olsun, sistemde bulunan diğer *sysCall()* fonksiyonu ile *exit()* fonksiyonu çağırılır, genellikle *sysCall()* fonksiyonu çağırılacak fonksiyonun index numarasını ve gerekiyorsa parametreleri alır. Ardından *sysCall()* fonksiyonu örneğimizde **53h** kesmesini kullanarak (oradaki sistem çağrı fonksiyonu ile) verilen sistem çağrı numarası ile gereken fonksiyonu sistem çağrı tablosundan bulup çağırır. Yani sistem çağrısı için genellikle iki fonksiyon bulunur. Biri **assembly** dilinde yazılan ve sistem çağrısını gerçekleştiren fonksiyon yani *IDT* tablosuna eklenen fonksiyon, diğeri ise **53h** kesmesini çağıran **C** ile yazılmış sistem çağrı fonksiyonu, bu fonksiyon ile de *assembly* fonksiyonuna parametreler geçirilir. Sanırım anladınız. Son olarak sistem çağrısı için kullandığımız iki örnek sistem çağrı fonksiyonunu görelim.

**C:**

    /* C Sistem Çağrı Fonksiyonu */
    long sysCall(int cagri_index, long param1, long param2, long param3, long param4){

    long ret;

    /* Çağrı kesmeye devrediliyor... */
    ASM ("int $0x53 "
         :"=a"(ret)
         :"a"(cagri_index),
         "b"(param1),
         "c"(param2),
         "d"(param3),
         "S"(param4));
    
    return ret;}

**Assembly:**
    
    ;eax = Çağrı indexi
    Cayux_Sys_Call_ASM:
        InterruptGir

        ;Sistem cagri parametreleri yigina atiliyor.
        push edi               ;4. parametre
        push edx               ;3. parametre
        push ecx               ;2. parametre
        push ebx               ;1. parametre

        call [cayux_Cagri_Tablosu + eax * 4]        ; Sistem cagrisi gerceklesiyor...

        ;Parametler geri aliniyor.
        pop ebx
        pop ecx
        pop edx
        pop edi

        InterruptCik
        iret

Burada gördüğünüz *InterruptGir* ve *InterruptCik* kısımları bir kesme calismadan once yapılan bazı islemleri(yazmaçların yığında saklanması) kısa yoldan yapmak icin tanımlanmıştır. Sistem çağrısının yapıldığı kısımda ise çok hoş bir olay var, *cayux_Cagri_Tablosu*'nun ilk elemanı *cayux_Cagri_Tablosu*'nun adresini göstermektedir. **EAX** yazmacında ise sistem çağrı indexi bulunmaktadır. Ayrıca *cayux_Cagri_Tablosu*'nun her bir elemanı **4** ( sizeof(unsigned long) ) byte uzunluğunda olduğundan tablodaki elemanlara şu şekilde erişilebilir: ` cayux_Cagri_Tablosu + eax * 4 `

Yine uzun denilebilecek bir yazı oldu, uzunluğunun önemi yok ama, faydalı olsun yeter. Yazdıkça kullandığımız sistemin ne kadar zekice olduğunu daha çok anlıyorum, hatta şurada koruma mekanizması ile ilgili kısa bir bilgi de vereyim, koruma mekanizmasının tasarımcıları arasında bir Türk buluyor yanılmıyorsam, ee bulması size kalsın hep devlet hep devlet nereye kadar di'mi ? Bu aşamadan sonra ne üzerine yazacağım bende bilmiyorum, fakat şu son örnek çok anlaşılır olmadı sanırım, *IDT* tablosunun doldurulması ve sistem çağrılarının yapılmasına ilişkin bir yazı olabilir, veya ufaktan süreç veya hafıza yönetimine giriş yapacağımız bir yazı da olabilir. Ama sanıyorum ki hafıza yönetimine yöneleceğim, çünkü işletim sistemlerinde **Scheduler** denilen bir sistem var gerçekten çok zekice olduğunu düşündüğüm bir olay onu göstermek için sabırsızlanıyorum... Başka bir önerisi olan ?
