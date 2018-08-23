---
title: PE Dosya Formatına Dalış
categories: Bilgisayar
---

Selamlar.

Bu kısa yazıda Windows ve birkaç işletim sisteminde daha kullanılan Taşınabilir Çalıştırılabilir(Portable Executable) dosya formatına dalacaz, inceleyecez.(***Yazarın yazıyı bitirdiği zamanki notu***: *kısa olacağını düşünmüştüm eeheh*) Geçen sene bu dosya formatı ile ilgili ufak bir yazı yazmıştım fakat oldukça üstünkörü ve yetersiz bir yazıydı. Bu blogda anlatılan şeylerle uğraşırken bu yapıyı iyi bilmemiz gerektiği için bir kez daha üzerinden geçmenin iyi bir fikir olacağını düşündüm.

Bir de şunu söyleyeyim, nasıl ki evrene baktığınızda her şey muazzam bir bütünlük, uyum içerisindeyse iş bilgisayar tarafında da evrendeki kadar muazzam olmasa da öyle. O nedenle burada anlattıklarımdan anlayamadıklarınız olabilir(veya ben anlatamamış da olabilirim neticede PE yapısının tekmilini biliyorum diyemem, derdimi anlatacak kadar PE biliyorum diyebilirim anca). Zamanla tüm yapıyı öğrendikçe taşlar yerine oturacaktır. Bazen bana öyle geliyor ki, sanki bütün işletim sistemi ve ona bağımlı yapıları tek bir kişi, tek bir günde yazmış. Çünkü sahiden o kadar birbirine bağımlı ve uyum içindeler. Neyse..

## PE nedir? Türleri nelerdir?

**PE**, eski 16 bit dosya formatı olan **MZ** formatının geliştirilmiş hâlidir. (Merak edenler için **MZ** kısaltması bir *MS-DOS* geliştiricisi ve dosya yapısının mimarı olan [Mark Zbikowski](https://en.wikipedia.org/wiki/Mark_Zbikowski) anısına kullanılıyor.) PE'den önce kullanılan MZ formatı günümüz korumalı işlemcilerine uygun değildi, lakin, o zamanlar bu dosya formatı (MZ) [**8086**](https://tr.wikipedia.org/wiki/Intel_8086) mimarisi için tasarlanmıştı bu nedenle günümüz işlemcilerinin korumalı moduna destek verecek biçimde tasarlanmamıştı. İşte bunun sonucu olarak *Microsoft* vuku bulan beklentileri karşılamak için yeni PE dosya formatını geliştirdi.

Günümüzde bu formatı bilgisayarda çalışan birçok dosyada görebiliyoruz. Örneğin **DLL**, **SCR**, **COFF**, **OCX**, **OBJ**, **SYS**(evet, sürücüler de) gibi dosya türleri yine baz olarak PE yapısını kullanmaktadır. Yine günümüzde **PE** yapısının *64* bit desteğinin sağlanabilmesi için **PE+** adı verilen *64* bit destekli PE dosya formatı da geliştirilmiştir. (Ne kurumsal bi dil oldu bu yahu?) 

Örneğin aşağıda klasik bir PE dosyasının başlangıç kısmının *hex* halini görüyorsunuz.

![](/files/pehexbakinca.jpg)

### RVA, VA, Raw Offset kavramları
PE dosyasının her durumunda dosyanın yapılarına erişmek için farklı bir adres hesaplama yöntemi kullanırız. Dosya sistemini tasarlayan kişiler içerisindeki elemanlara ulaşırken belli bir adresi kullanmaktansa(bu, PE dosyasının hafızaya yüklenmesi sırasında zorluk çıkarabileceği için sanırım) **RVA**(Relative Virtual Address) denilen bir şey geliştirmişler. PE incelemesi yaparken sanırım en çok kafa karıştıran kısım da bunların arasındaki farkı anlamak oluyor. Bi süre ben de lahana turşusu moduna geçtim fakat bir yerden sonra da o "*aha işte bu!*" aydınlanmasını yaşıyorsunuz, merak etmeyin.

Hafızadaki ve diskteki yapının birbirinden birazcık farklı olduğunu unutmamalısınız. Windows'un kullandığı sanal hafıza yönetimi, sayfa tabanlı hizalama yapacağı için muhtemelen hafızaya yüklenen dosya disktekinden farklı gözükecektir. (Yine ayrıca PE kendi içerisinde bazı hizalamalar yaptığı için bu da farklılık sağlayabilir) Yani şunu demek istiyorum, Windows PE yapısındaki bölümleri hafızaya "*map*" ederken bu bölümleri (genelde) **4 KB**'lık sayfalara uygun şekilde hizalamaktadır. Bu nedenle bölümler arasında boşluklar oluşabilmektedir. Bu da yapı hafızadayken bazı farklılıklara sebebiyet veriyor doğal olarak.

Peki bunlar kavramlar arasındaki fark nedir?

**VA**: *Virtual Address* veya *Sanal Adres*, adından da anlaşıldığı gibi dosya hafızaya yüklendiği ve tüm hizalamaların yapıldığı durumda elimizde olan bir elemanın adresine verilen isimdir.

**RVA**: *Relative Virtual Address* veya *Göreceli Sanal Adres*(ehehe), adından da anlaşıldığı gibi bir şeye göre "göreceli" olan adres. Ve göreceliliğin dayandığı ise genelde PE yapısında bulunan **ImageBase** elamanını belirttiği değer oluyor. **ImageBase** dosyanızın hafızaya map edildikten sonra(buna Türkçe olarak ne diyecem karar veremedim..) nereden başladığını belirtir (Eğer bu sanal adres doluysa, *tehcir*, yani yeniden yer değiştirme işlemi(**relocation**) yapılır.) Örneğin günümüz sistemlerinde **EXE** dosyalarının* ImageBase* kısmı genelde `0x400000` olmaktadır. (Debug ettiğiniz programların bu adresten başlamasının sebebi de budur) PE yapısı içerisinde aldığınız yer bilgileri genelde RVA ile belirtilir, yani program hafızaya yüklendikten sonraki başlangıç adresine ekleyeceğiniz RVA size elemanın gerçek adresini(VA) vermektedir.

Özet geçiyorum; RVA, dosyanın hafızaya yüklendikten sonraki başlangıç adresi ile aradığımız elemanın oraya olan uzaklığını vermektedir.

Şunu da ekleyeylim, VA ile RVA arasındaki bağlantıyı daha iyi ifade etmek için şu şekilde formüle dökebiliriz : `VA = ImageBase + RVA`

**Raw Offset**: Biraz önceki RVA dosya hafızada iken geçerliydi. Peki ya <u>diskte bulunan</u> bir dosya için ne yapacağız? İşte bu durumda elimizdeki RVA adresini *Raw Offset*'e dönüştürmeliyiz. Bu nasıl oluyor derseniz, bizdeki RVA dosyada bir *bölüm*(section) içinde bulunmaktadır. Bu bölümün başlık bilgilerinde ise bölümün *hafızada* ve *diskte* nereden başladığı ve bittiği(bölümün uzunluğu aslında) bilgisi bulunmaktadır. Siz bu başlık bilgisine ulaşıp, ardından bölümün hafızadaki başlangıç RVA değerini kendi elemanınızın RVA değerinizden çıkarıp, bölümün diskteki başlangıç değerini eklerseniz böylece Raw Offset değerine de ulaşmış olursunuz. Yani;

    Raw Offset = (ElinizdekiRVA - BölümünSanalOffseti) + BölümünDisktekiOffseti

## PE formatının genel yapısı

Bir PE dosyası birçok verinin birleşmesiyle oluşur. Bunların içinde farklı türdeki verileri saklamak için bölümler, dosyanın işleyişi ile ilgili bilgileri tutan tablolar bulunabilir. Tüm bu tablolar ve bölümler aslında işletim sistemi için anlam ifade eder. Çünkü işletim sistemi bu bilgilere bakarak dosyayı çalıştıracak hâle getirir. Gereken DLL'leri bu bilgiler yardımıyla bulur, hizalama işlemlerini buradaki bilgiler ile yapar, hangi bölümün nereden başladığını da yine dosyada bulunan bilgiler sayesinde bulur.

Örnek bir PE dosyasının diskteki yapısını göstereyim:

![](/files/peyapisi.png)

Gördüğünüz gibi PE dosyasının üst kısımlarında genelde gereken bilgileri içeren birkaç tablo, devamında bölümlerin tanımlamaları ve daha sonrasında da o tanımlanan bölümlerin içeriği geliyor. Yazı boyunca bu temel görünüm üzerinden sırayla gitmeye çalışacam. O nedenle öncelikle DOS başlığı ile başlıyoruz.

### DOS başlığı
*DOS başlığı* esasen PE formatında geriye dönük uyumluluğu sağlamak için tutuluyor. Başka da pek bir işe yaradığı söylenemez. Bu bölüm ile birlikte bir de DOS programı denilen küçük bir program var. Eğer bu dosya DOS sisteminde çalıştırılırsa çalıştırılamayacağını belirtip kapanıyor.(DOS programını incelemenizi tavsiye ederim, kısa zaten. Ha bi de, Microsoft derleyicilerinin bir zamanlar bu DOS programının altına bir şeyler eklediğini duymuştum, fakat sanırım artık eklemiyor. Ne idi, ne yapıyordu pek bilmiyorum) Bence artık SSD kullanımının da arttığı şu günlerde Microsoft DOS Header'ı kaldırsa, bize az da olsa disk alanı kazanabileceğini düşünüyorum ehehe. DOS kullanan mı kaldı yahu? Bu arada, bu DOS Stub hemen hemen hiç kullanılmadığı için onun alanını siz kullanabilirsiniz, aklınızda bulunsun. DOS başlığının yapısı `winnt.h` dosyasında şu şekilde tanımlanmış.

    typedef struct _IMAGE_DOS_HEADER {      // DOS .EXE header
        WORD   e_magic;                     // Magic number (4D5A yani "MZ")
        WORD   e_cblp;                      // Bytes on last page of file
        WORD   e_cp;                        // Pages in file
        WORD   e_crlc;                      // Relocations
        WORD   e_cparhdr;                   // Size of header in paragraphs
        WORD   e_minalloc;                  // Minimum extra paragraphs needed
        WORD   e_maxalloc;                  // Maximum extra paragraphs needed
        WORD   e_ss;                        // Initial (relative) SS value
        WORD   e_sp;                        // Initial SP value
        WORD   e_csum;                      // Checksum
        WORD   e_ip;                        // Initial IP value
        WORD   e_cs;                        // Initial (relative) CS value
        WORD   e_lfarlc;                    // File address of relocation table
        WORD   e_ovno;                      // Overlay number
        WORD   e_res[4];                    // Reserved words
        WORD   e_oemid;                     // OEM identifier (for e_oeminfo)
        WORD   e_oeminfo;                   // OEM information; e_oemid specific
        WORD   e_res2[10];                  // Reserved words
        LONG   e_lfanew;                    // File address of new exe header
      } IMAGE_DOS_HEADER, *PIMAGE_DOS_HEADER;

DOS kullanmadığımızdan mütevellit burada yalnızca 2 eleman ile ilgileneceğiz. `e_magic` ve `e_lfanew`. İlk değer DOS başlığının tanıtıcı değeri, imzası. (Tanıtıcı değer de ne oluyorsa artık..) Bu değer dosyanın DOS olduğunu belirtmek için kullanılıyor. İşletim sistemi veya bu yapıyla uğraşan kişi bu değeri doğruyarak "aa, evet bu bir dos başlığı yapısı" diyor. 

**4 bayt**'lık `e_lfanew` ise bize PE başlığının *offset* değerini veriyor. Yani, PE başlığına ulaşmak için `DosHeader + DosHeader->e_lfanew` gibi basit bir işlem yapıyoruz diyebiliriz.

### PE(File) başlığı ve imzası
DOS başlığından sonra gelen bir diğer başlık *PE başlığı*. Bu başlığın hemen başında *PE imzası* denilen imza bulunuyor. (4 Byte uzunluğunda, değeri ise `45 50 00 00`) Bu imzayı da PE başlığını doğrulamak için kullanabilirsiniz. Misal, örneğin hem bu imzayı hem de DOS imzasını şöyle basitçe doğrulayarak dosyanın bir PE dosyası olduğunu doğrulamada ilk adımı atabilirsiniz.

    if (DosHeader->e_magic == IMAGE_DOS_SIGNATURE && 
        NtHeader->Signature == IMAGE_NT_SIGNATURE)
    {
        //Evet bu bir PE dosyası
    }
    else
    {
        //Hayır, bu bir PE dosyası değil.
    }

**IMAGE_DOS_SIGNATURE** ve **IMAGE_NT_SIGNATURE** `winnt.h` dosyasında tanımlı olan sabitler.

Yine `winnt.h` dosyasında (PE) File Header ise aşağıdaki yapı ile tanımlanıyor.

    typedef struct _IMAGE_FILE_HEADER {
        WORD    Machine;                //Programın çalışması beklenen CPU
        WORD    NumberOfSections;       //Kaç tane bölüm(section) var? (Bölme mi desek acaba ya?)
        DWORD   TimeDateStamp;          //Dosyanın üretildiği zaman
        DWORD   PointerToSymbolTable;   //COFF sembol tablosuna gösterici (Yalnızca COFF dosyaları)
        DWORD   NumberOfSymbols;        //Sembol tablosundaki sembol sayısı
        WORD    SizeOfOptionalHeader;   //sizeof(IMAGE_OPTIONAL_HEADER)
        WORD    Characteristics;        //Dosya hakkında bilgi (bir kısmını aşağıya koyacam)
    } IMAGE_FILE_HEADER, *PIMAGE_FILE_HEADER;

Buradaki girdiler az çok kendini açıklıyor. Bir iki açıklama yapmak istediğim *Machine*, *NumberOfSections* ve  *Characteristics* kısmı var.  

Misal *NumberOfSections* önemli. İleride bir PE dosyasını incelerken kaç tane bölümü/bölmesi/kısmı var buraya bakarak öğrenebilirsiniz. Şöyle bir for döngüsü düşünün yani, bu sayede tüm bölmeleri gezip bilgi de alabilirsiniz:
    
    //Bu makro dosyadaki ilk bölümü geri döner(Bölüm başlıkları kısmına bakınız)
    #define IMAGE_FIRST_SECTION( ntheader ) ((PIMAGE_SECTION_HEADER)        \
        ((ULONG_PTR)(ntheader) +                                            \
        FIELD_OFFSET( IMAGE_NT_HEADERS, OptionalHeader ) +                  \
        ((ntheader))->FileHeader.SizeOfOptionalHeader                       \
        ))

    pSectionHeader = IMAGE_FIRST_SECTION(NtHeader);
    for (INT i = 0; i < NtHeader->FileHeader.NumberOfSections; i++)
    {
        //Burada bölüm bilgileri alınır, yapılacak
        //işlemler yapılır
        
        //ardından sonraki bölüme geçilir
        pSectionHeader = pSectionHeader++;
    }

Devam edelim.. **Machine** kısmına gelirsek, yine `winnt.h` dosyasında tanımlı birkaç sabiti göstereyim.

* `0x014c` -> Intel 386 (IMAGE_FILE_MACHINE_I386)
* `0x0200` -> Intel 64  (IMAGE_FILE_MACHINE_IA64)
* `0x01c0` -> ARM Little-Endian (IMAGE_FILE_MACHINE_ARM)

gibi..  Programın çalışacağı işlemciyi belirtiyor anlayabileceğiniz üzere.

**Characteristics** kısmının alabileceği değerleri yine `winnt.h` dosyasında bulabiliriz. Buradaki değerleri bitsel veya işlemine sokup birleştirebilirsiniz.
 
* `0x0001`  // Relocation bilgisi yok                     (IMAGE_FILE_RELOCS_STRIPPED)
* `0x0002`  // Çalıştırılabilir                           (IMAGE_FILE_EXECUTABLE_IMAGE)
* `0x0020`  // Uygulama 2gb'dan fazla adres kullanabilir  (IMAGE_FILE_LARGE_ADDRESS_AWARE)(ehehe)
* `0x0100`  // 32 bit makine                              (IMAGE_FILE_32BIT_MACHINE)
* `0x1000`  // Sistem dosyası                             (IMAGE_FILE_SYSTEM)
* `0x2000`  // DLL dosyası                                (IMAGE_FILE_DLL)
* `0x4000`  // Tek işlemcili olması gerek                 (IMAGE_FILE_UP_SYSTEM_ONLY)

Buradaki `IMAGE_FILE_RELOCS_STRIPPED` biraz açmak gerekirse, PE dosyaları hafızaya yüklenirken öncelikli bir yüklenme adresleri oluyor(ImageBase). Eğer buraya yüklenemezse yine PE içerisindeki **Relocation** girdilerine bakarak tehcir işlemi yapılıyor. Fakat, eğer *Characteristics* kısmında `IMAGE_FILE_RELOCS_STRIPPED` var ise, demek ki bu dosyada bu Relocation bilgileri yok, yani illa o seçtiği adrese yüklenmesi lazım.

### PE isteğe bağlı(!) başlığı (PE Optional Header)
Başlığın ismi sizi yanıltmasın. Aslında hiç de isteğe bağlı bir başlık değil, aksine oldukça kritik bilgiler içeriyor.  Bu yapının hem 64 bit hem de 32 bitlik versiyonu var. Aşağıdaki 32 bitlik. 64lük ile arasında çok fark yok, hatta yanlış hatırlamıyorsam sadece boyut farkı var. 64 bit desteği olduğu için yapı elemanlarının tiplerini değiştirmişler. Şimdi 32 bitlik yapıyı görelim:

    #define IMAGE_NUMBEROF_DIRECTORY_ENTRIES    16  //Kaç tane dizin girdisi var?
    //
    // Veri dizin girdilerinin yapısı
    //
    typedef struct _IMAGE_DATA_DIRECTORY {
        DWORD   VirtualAddress;              //Tablonun RVAsı
        DWORD   Size;                        //Tablonun boyutu
    } IMAGE_DATA_DIRECTORY, *PIMAGE_DATA_DIRECTORY;

    //
    // Optional başlık yapısı
    //
    typedef struct _IMAGE_OPTIONAL_HEADER {
        //Standart alanlar
        WORD    Magic;
        BYTE    MajorLinkerVersion;
        BYTE    MinorLinkerVersion;
        DWORD   SizeOfCode;
        DWORD   SizeOfInitializedData;
        DWORD   SizeOfUninitializedData;
        DWORD   AddressOfEntryPoint;
        DWORD   BaseOfCode;
        DWORD   BaseOfData;

        //NT spesifik alanlar
        DWORD   ImageBase;
        DWORD   SectionAlignment;
        DWORD   FileAlignment;
        WORD    MajorOperatingSystemVersion;
        WORD    MinorOperatingSystemVersion;
        WORD    MajorImageVersion;
        WORD    MinorImageVersion;
        WORD    MajorSubsystemVersion;
        WORD    MinorSubsystemVersion;
        DWORD   Win32VersionValue;           //Rezerve
        DWORD   SizeOfImage;
        DWORD   SizeOfHeaders;
        DWORD   CheckSum;
        WORD    Subsystem;
        WORD    DllCharacteristics;
        DWORD   SizeOfStackReserve;
        DWORD   SizeOfStackCommit;
        DWORD   SizeOfHeapReserve;
        DWORD   SizeOfHeapCommit;
        DWORD   LoaderFlags;                 //Rezerve
        DWORD   NumberOfRvaAndSizes;
        IMAGE_DATA_DIRECTORY DataDirectory[IMAGE_NUMBEROF_DIRECTORY_ENTRIES];
    } IMAGE_OPTIONAL_HEADER32, *PIMAGE_OPTIONAL_HEADER32;

Görüldüğü üzere biraz uzun bir yapı. Hepsini olmasa da işinize yarayacak alanları açıklamaya çalışayım:

**Magic**

`0x010b` ise **PE32**, `0x020b` ise **PE32+** anlamını taşıyor.

**MajorLinkerVersion & MinorLinkerVersion**

Programın bağlayıcısının majör ve minör versiyon bilgileri.

**SizeOfCode**

Dosya içerisinde kod bulunduran bölümlerin toplam boyutu. Genelde `.text` bölümünün boyutunu veriyor. (Tabi başka kod içeren alan yok ise, var ise onların boyutunu da toplama katıyor.)

**SizeOfInitializedData & SizeOfUninitializedData**

İlki, ilkdeğeri olan verilerin bulunduğu bölümlerin toplam boyutunu verir. (Genelde `.data` bölümünde oluyorlar) İkincisi ise ilkdeğer verilmemiş verilerin bulunduğu bölümlerin toplam boyutunu verir. (Bunlar ise `.bss` içinde oluyor.)

**AddressOfEntryPoint**

Burası programın başlangıç noktasının RVA'sını verir. Misal yazdığınız C programı `main()` fonksiyonundan mı başlıyor?(Ki, normalde başlamaz, derleyicilerin bir başlangıç fonksiyonu vardır, onunla başlar) O hâlde burada onun RVA'sı oluyor. Dosya DLL ise mesela o zaman da `DllMain()` fonksiyonunun RVA'sı burada oluyor. Önemli alanlardan biridir.

**BaseOfCode**

Çalıştırılabilir makine kodlarını içeren `.text` bölümünün başlangıç *RVA*sı. (Kullanılan derleyiciye göre `.text` değişebilir aklınızda bulunsun.)

**BaseOfData**

Statik verilerin tutulduğu `.data` bölümünün başlangıç *RVA*sı.

**ImageBase**

Bağlayıcı(*linker*)'nın PE dosyası için öncelikli tercih ettiği yüklenme adresi. Mesela burası `0x530000` ise, Windows'un PE yükleyicisi dosyayı bu sanal adrese yüklemeye çalışır ve dosya bu adresten başlar. Bağlayıcılar **EXE** dosyalar için genelde bu adresi *4MB* (`0x00400000`) olarak seçerler. **DLL** dosyaları için ise genelde bu değer *1MB* (`0x10000000`) olarak seçilir. Tercih edilen yükleme adresi kullanılamadığı durumlarda ise devreye *relocation* dizini girer. Genelde **DLL** dosyalarının yüklenme adresleri çakıştığı için *relocation* **DLL** dosyalarının hafızaya yüklenmesinde sıkça kullanılır.

**SectionAlignment**

Bu değer dosyadaki bölümlerin hafızaya yüklenirken nasıl bir hizalamaya uyacağını belirtir. Genelde buradaki değer **4KB** (`0x00001000`) değerini içerir. Hatırlarsanız 4 KB Windows sistemlerdeki sık kullanılan <u>sayfa boyutu</u> idi. Bu da demektir ki, mesela **X bölümü** yüklendikten sonraki **Y bölümü**, hafızaya sonraki <u>4K'nın katı</u> olan adresten itibaren yüklenecek. İşte bu hafızadaki PE dosyasının bölümleri arasında boşluk olabilmesinin sebeplerindendir.

**FileAlignment**

Bu hizalama değeri ise bölümlerin *diskte* hangi değerin katına uygun olarak sıralanacağını belirtir. Genelde **512** değeri kullanılır. Bu da yanlış hatırlamıyorsam yine Windows'un disk yönetiminde kullandığı <u>sektör boyutu</u> idi.

**MajorOperatingSystemVersion & MinorOperatingSystemVersion**

Bu iki değer PE dosyasının minimum işletim sistemi versiyon bilgisini içerir. Hani bazen yeni bir programı XP'de çalıştırmaya çalışırsınız da "*Bu geçerli bir Win32 uygulaması değil hacı*" uyarısı alırsınız ya, işte o durumda bu iki alanı düzenleyin böylece artık uygulama da bir bağlamda çalışabilir olur.

**MajorImageVersion & MinorImageVersion**

Dosyanın majör ve minör versiyon bilgisi.

**MajorSubsystemVersion & MinorSubsystemVersion**

Dosyanın desteklediği majör ve minör alt sistem bilgisi.

**SizeOfImage**

Bu alan dosyanın hafızaya yüklendiğinde ne kadar alan kaplayacağını belirtiyor.

**SizeOfHeaders**

DOS başlığı, PE başlığı(optional dahil) ve bölüm başlıklarının toplam boyutu.

**Subsystem**

Dosyanın kullanıcı arabirimi için gerektirdiği alt sistem. Konsol uygulaması mı? Arayüz mü? Sürücü mü? gibi bilgiler bu alan sayesinde elde edilebilir. Örneğin bazı sık kullanılan değerler ve ifade ettiği sistem aşağıdaki gibidir:

* IMAGE_SUBSYSTEM_UNKNOWN              0   // Bilinmiyor
* IMAGE_SUBSYSTEM_NATIVE               1   // Alt sistem gerektirmiyor
* IMAGE_SUBSYSTEM_WINDOWS_GUI          2   // Windows GUI
* IMAGE_SUBSYSTEM_WINDOWS_CUI          3   // Windows konsol
* IMAGE_SUBSYSTEM_WINDOWS_CE_GUI       9   // Windows CE

**DllCharacteristics**

DLL hakkında bazı özellikleri bitsel olarak içerir, haliyle her bit farklı anlamlar içerir. (Kullanılabilecek değerler için `winnt.h` dosyasına bakılabilir)

**SizeOfStackReserve**

Program için ayrılacak Stack(yığın) boyutu. Öntanımlı olarak **1MB**(`0x00010000`) değerini içerir. Buradaki değer programda `CreateThread` API'si kullanılarak oluşturulan threadlere stack boyutu vermezse, oluşturulacak thread için de geçerli olur. Burada belirtilen alanın tamamı hemen threade verilmez, verilecek alan sonraki elemanda belirtilir.

**SizeOfStackCommit**

Başlangıçta stack için "*commit*" edilecek yığın boyutu. Öntanımlı olarak **4K**(`0x00001000`) değerini alır. Bu da tam olarak 1 sayfaya denk geliyor.

**SizeOfHeapReserve**

Programın Heap alanı için ayrılacak miktar. Öntanımlı olarak **1MB** (`0x00010000`) değerini içerir. Fakat program çalışırken ihtiyaç duyması durumunda otomatik olarak arttırılabilir.

**SizeOfHeapCommit**

Burası ise başlangıçta "*commit*" edilecek heap miktarını belirtir. Öntanımlı olarak **4K**(`0x00001000`) değerine sahiptir.

**NumberOfRvaAndSizes**

Dosya içerisindeki veri dizininde kaç tane girdi olduğunu belirtir.

Son olarak şunu ekleyim. Burada gördüğünüz 3 ana yapıyı tek bir yapı kullanıp da belirtebilirsiniz. Bu yapının adı da `IMAGE_NT_HEADERS`.

    typedef struct _IMAGE_NT_HEADERS {
        DWORD Signature;                          //PE imzası
        IMAGE_FILE_HEADER FileHeader;             //PE File header
        IMAGE_OPTIONAL_HEADER32 OptionalHeader;   //PE Optional header
    } IMAGE_NT_HEADERS32, *PIMAGE_NT_HEADERS32;

Hâliyle bir de şuna benzer bir şekilde kendi yapınızı tanımlarsanız tüm bu yapılara basitçe ulaşabileceğiniz bir yol oluşturmuş olursunuz.

    typedef struct _FILE_HEADER {
        PIMAGE_DOS_HEADER DosHeader;   //Bu DOS başlığını tutacak
        PIMAGE_NT_HEADERS NtHeader;    //Bu ise PE başlığını tutacak
    }FILE_HEADER, *PFILE_HEADER;

### Veri dizini (Data directory)
Bu alan **8 bayt** uzunluğundaki `IMAGE_DATA_DIRECTORY` yapılarını içeriyor. Toplamda 16 tane var ve hepsinin dosya için ayrı bir işlevi var. Bu dizini mesela evinizdeki çeşitli şeylerin yerini tanımlayan bir liste olarak düşünebilirsiniz.(Bu ne saçma benzetme yahu?) İşte birinci sıraya bakınca *elbiselerin* yeri var, ikincide *kitaplar* var, üçüncüde *muzlar* var gibi. Yalnızca şuna dikkat etmek gerekiyor, bizim bu girdilerimiz bu "*şeyleri*" değil, bu şeylerin "*yerini*" bize söylüyor. Mesela burada neler var derseniz:

    #define IMAGE_DIRECTORY_ENTRY_EXPORT          0   // Export Directory
    #define IMAGE_DIRECTORY_ENTRY_IMPORT          1   // Import Directory
    #define IMAGE_DIRECTORY_ENTRY_RESOURCE        2   // Resource Directory
    #define IMAGE_DIRECTORY_ENTRY_EXCEPTION       3   // Exception Directory
    #define IMAGE_DIRECTORY_ENTRY_SECURITY        4   // Security Directory
    #define IMAGE_DIRECTORY_ENTRY_BASERELOC       5   // Base Relocation Table
    #define IMAGE_DIRECTORY_ENTRY_DEBUG           6   // Debug Directory
    #define IMAGE_DIRECTORY_ENTRY_ARCHITECTURE    7   // Architecture Specific Data
    #define IMAGE_DIRECTORY_ENTRY_GLOBALPTR       8   // RVA of GP
    #define IMAGE_DIRECTORY_ENTRY_TLS             9   // TLS Directory
    #define IMAGE_DIRECTORY_ENTRY_LOAD_CONFIG    10   // Load Configuration Directory
    #define IMAGE_DIRECTORY_ENTRY_BOUND_IMPORT   11   // Bound Import Directory in headers
    #define IMAGE_DIRECTORY_ENTRY_IAT            12   // Import Address Table
    #define IMAGE_DIRECTORY_ENTRY_DELAY_IMPORT   13   // Delay Load Import Descriptors
    #define IMAGE_DIRECTORY_ENTRY_COM_DESCRIPTOR 14   // COM Runtime descriptor

`IMAGE_DATA_DIRECTORY` yapısındaki **VirtualAddress** kısmı bu dizin girdisinin gösterdiği elamanın RVA'sını içeriyor. **Size** ise tahmin edilebileceği gibi o yapının boyutunu. Dizin girdisindeki her elemanın ayrı işlevleri var fakat hepsini açıklarsam sanıyorum yüz sayfalık bir makale oluşturabilir. O nedenle sık kullanılan ve aynı zamanda önemli olanları anlatıcam.

Bu arada, veri dizinini kabaca görselleştirirsek aşağı yukarı şöyle bir şey çıkıyor diyebiliriz:

![](/files/datadirdiag.png)

Mesela buradaki *Import Directory*'e programsal(eheh) olarak ulaşmak için şöyle bir mantık izleyebiliriz:
    
    //IMAGE_DIRECTORY_ENTRY_IMPORT = 1, Bu girdinin VirtualAddress değerini alıyoruz, yani RVAsını
    importRVA = NtHeader->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_IMPORT].VirtualAddress;

    //Ardından bunu yukarıda anlattığımız biçimde disk offsetine çeviriyoruz
    //bu bizim dosyadaki ilk import edilen DLLimiz.
    IID = (PIMAGE_IMPORT_DESCRIPTOR)(RvaToRaw(importRVA, pFileHeader));

Bu küçük kod parçacığı sayesinde Import Directory yapısını alabilmiş oluyoruz. `IMAGE_IMPORT_DESCRIPTOR` yapısına takılmayın sonraki bölümlerde bahsedecem.

Örneğin aşağıda diskteki bir dosyanın veri dizinini onaltılık bir biçimde görebilirsiniz. Her biri 8 baytlık, 16 adet `IMAGE_DATA_DIRECTORY` yapısı.. 

![](/files/datadirhex.png)

Misal bakarsanız buradaki **2.** 8 baytlık kısım (pembe olan, yani `DataDirectory[1]`) bizim Import tablomuz hakkında bilgi veriyor. Az önce verdiğim küçük kod parçacığının yaptığını gelin manuel olarak yapalım. Dikkat ederseniz burada bizim **VirtualAddress** değerimiz `000040A0`, **Size** değerimiz ise `0000008C`. Şimdi bu bilgiler ışığında(oooğğ, aydınlanmaya gönderme var burada) raw offset değerini bulalım.

Bunun için öncelikle bu RVA'nın bulunduğu bölümü tespit etmemiz gerekiyor. Bu sayede asıl veriye ulaşabileceğiz.

![](/files/pesections.png)

Bizim RVA `40A0` idi, `.rdata` bölümüne bakarsanız **VirtualAddress** değerinde `4000` görürsünüz. Yani bu demektir ki bizim RVA'mız bu bölüme denk geliyor. <u>O halde bölümün sanal adresini RVA'mızdan çıkarıp, üzerine bölümün diskteki offsetini(PhysAddr) eklersek istediğimiz disk offsetini elde ederiz.</u>

Yani: `0x000040A0-0x4000+0x2C00 = 0x2CA0`. Herhangi bir hex düzenleyicisi ile bakarsanız Import tablosu tanımlayıcısına ulaşmış olduğunuzu görebilirsiniz.

Son olarak veri dizininde bulunan girdileri belirten sabitleri göstereyim. Bu sabitler yardımıyla veri dizininden bir girdi almak için `NtHeader->OptionalHeader.DataDirectory[DIZIN_NUMARASI].VirtualAddress;` gibi bir şey yapabilirsiniz.

### Bölüm başlıkları (Section Headers)
PE başlığı bittikten hemen sonra bölüm başlıkları geliyor (*Yani ilk bölüm başlığını almak için DOS ve PE başlığını geçmeniz gerekiyor, geçince ilk section header'ı alıyorsunuz*). Bölüm başlıkları `IMAGE_SECTION_HEADER` (40 bayt uzunlukta) yapısı içeren bir diziden oluşuyor. Yani mesela dosyada 6 bölüm varsa, bu dizide 6 girdi oluyor. Buradaki başlıkların her biri dosya içindeki bir bölümü(section) tanımlıyor. Yanılmıyorsam bir PE dosyasında maksimum 65535, minimum 2(1 kod için 1 veri için) tane bölüm olabiliyor. (Fakat hiçbir bölümü olmayan ama çalışabilen dosyalar var)(Yukarıdaki yapıda *NumberOfSections* WORD tanımayıcısına sahip, yani 16 bit. Bu nedenle 2^16 = 65536-1 tane maksimum bölüm oluyor.)

Burada tanımlanan tüm bölümler PE Optional başlığında belirtilen **SectionAlignment** bilgisine göre hafızada, **FileAlignment** bilgisine göre ise dosyada hizalanıyor.

Bölüm başlıklarının yapısını göstermem gerekirse o da şöyle:

    typedef struct _IMAGE_SECTION_HEADER {
        BYTE    Name[IMAGE_SIZEOF_SHORT_NAME]; //Bölümün adı (IMAGE_SIZEOF_SHORT_NAME=8)
        union {
                DWORD   PhysicalAddress;       //OBJ dosyaları için bölümün fiziksel adresi
                DWORD   VirtualSize;           //Bölümün hafızada kapladığı yer
        } Misc;
        DWORD   VirtualAddress;                //Bölümün hafızadaki RVAsı
        DWORD   SizeOfRawData;                 //Bölümün diskte kapladığı yer
        DWORD   PointerToRawData;              //Bölümün diskteki offseti (FileAlignment'e bölünebilir olmalı)
        DWORD   PointerToRelocations;          //Bölümün relocation girdilerine gösterici(0 ise girdi yok)(OBJ için)
        DWORD   PointerToLinenumbers;          //??
        WORD    NumberOfRelocations;           //Bu bölüme ait toplam relocation sayısı(OBJ)
        WORD    NumberOfLinenumbers;           //??
        DWORD   Characteristics;               //Bölümün özellikleri, kod mu içeriyor? veri mi? vs.
    } IMAGE_SECTION_HEADER, *PIMAGE_SECTION_HEADER;

Yukarıda bahsettiğimiz RVA, Raw Offset dönüşümünde işte buradaki değerleri kullanıyorsunuz. **VirtualAddress**, **PointerToRawData** gibi..

Örneğin yükleyici burada şu şekilde ilerliyor. Her bölümün **PointerToRawData** değerinin gösterdiği yerden **SizeOfRawData** kadar veriyi okuyor, ardından bunu hafızaya **ImageBase + VirtualAddress** bölümüne **VirtualSize** boyutunda ve **Characteristics** kısmında gösterilen özelliklere uygun olarak yüklüyor. 

Bölümdeki bazı değerlerin neler olabileceğine gelirsek. Mesela *Characteristics* bölümü için aşağıdaki seçenekler mevcut. (Daha da var fakat çok yer kaplamaması için kısa tutuyorum/önemli olanları gösteriyorum)

* `0x00000020` - IMAGE_SCN_CNT_CODE                // Bölüm kod içeriyor 
* `0x00000040` - IMAGE_SCN_CNT_INITIALIZED_DATA    // Bölümde ilk değer verilmiş veri var
* `0x00000080` - IMAGE_SCN_CNT_UNINITIALIZED_DATA  // Bölümde ilk değer verilmemiş veri var
* `0x20000000` - IMAGE_SCN_MEM_EXECUTE             // Bölüm çalıştırılabilir
* `0x40000000` - IMAGE_SCN_MEM_READ                // Bölüm okunabilir
* `0x80000000` - IMAGE_SCN_MEM_WRITE               // Bölüm yazılabilir

Mesela gördüğünüz gibi, bir PE dosyasını incelerken bölümler hakkında çok güzel bilgiler edinebiliyorsunuz. Bölüm çalıştırılabilir mi? Yazılabilir mi? Ne içeriyor? gibi sorulara bir nebze cevabı buradan bulabilirsiniz. Örneğin `.text` bölümü çalıştırılabilir kodları içerir ve genelde sahip olduğu izinler şöyledir : `IMAGE_SCN_CNT_CODE | IMAGE_SCN_MEM_EXECUTE | IMAGE_SCN_MEM_READ`. Sadece hayal gücünüzü kullanın. Belki de bir anti-virüsün koruma modulü bu değerlere bakıp dosyanın ne yaptığını ile ilgili bilgi topluyordur. Neden olmasın?

Şimdi örnek olarak bir dosyanın bölüm tanımlamalarını da göstereyim.

![](/files/sectionornek.png)

Ha, şunu da söyleyeyim. Veri dizininde bulunan çoğu tablo bu bölümlerden birinin içinde bulunuyor. İşte bu nedenden dolayı siz veri dizininden aldığınız sanal adres değerini, önce içinde bulunduğu bölümü bulup ardından gereken **Rva->Raw offset** dönüşümüne tabii tutmanız gerekiyor.

Son olarak da en çok bilinen bölüm isimlerinin ne anlama geldiğini ne içerdiğini de ekleyip ardından dosya yapısı içerisindeki diğer elemanlara geçelim.

<center>
<style type="text/css">
.tg  {border-collapse:collapse;border-spacing:0;border-color:#aabcfe;}
.tg td{font-family:Arial, sans-serif;font-size:14px;padding:10px 5px;border-style:solid;border-width:1px;overflow:hidden;word-break:normal;border-color:#aabcfe;color:#669;background-color:#e8edff;}
.tg th{font-family:Arial, sans-serif;font-size:14px;font-weight:normal;padding:10px 5px;border-style:solid;border-width:1px;overflow:hidden;word-break:normal;border-color:#aabcfe;color:#039;background-color:#b9c9fe;}
.tg .tg-v4ss{background-color:#D2E4FC;font-weight:bold;vertical-align:top}
.tg .tg-yw4l{vertical-align:top}
.tg .tg-6k2t{background-color:#D2E4FC;vertical-align:top}
.tg .tg-9hbo{font-weight:bold;vertical-align:top}
</style>
<table class="tg">
  <tr>
    <th class="tg-yw4l">Bölüm İsmi</th>
    <th class="tg-yw4l">Bölüm Tanımı</th>
  </tr>
  <tr>
    <td class="tg-v4ss">.text/CODE</td>
    <td class="tg-6k2t">Çalıştırılabilir makine kodları</td>
  </tr>
  <tr>
    <td class="tg-9hbo">.data</td>
    <td class="tg-yw4l">Global ve statik veriler(INIT.)</td>
  </tr>
  <tr>
    <td class="tg-v4ss">.bss</td>
    <td class="tg-6k2t">Global ve statik veriler(UNINIT.)</td>
  </tr>
  <tr>
    <td class="tg-9hbo">.rsrc</td>
    <td class="tg-yw4l">Kaynaklar(Resource)</td>
  </tr>
  <tr>
    <td class="tg-v4ss">.idata</td>
    <td class="tg-6k2t">Import edilen fonksiyon bilgileri</td>
  </tr>
  <tr>
    <td class="tg-9hbo">.edata</td>
    <td class="tg-yw4l">Export edilen fonksiyon bilgileri</td>
  </tr>
  <tr>
    <td class="tg-v4ss">.reloc</td>
    <td class="tg-6k2t">Relocation bilgisi</td>
  </tr>
<tr>
    <td class="tg-v4ss">.tls</td>
    <td class="tg-6k2t">Thread Local Storage
</td>
  </tr>
  <tr>
    <td class="tg-9hbo">.rdata</td>
    <td class="tg-yw4l">Debug bilgisi ve başka ıvır zıvırlar</td>
  </tr>
</table></center>

`.data` ile `.bss` kafanızı karıştırmasın. `.data` bölümünde statik ve ilk değer verilen değişkenler bulunur. Mesela `static int bek = 54;` şeklinde tanımlanan bir değişken burada yer alır. `.bss` bölümünde ise ilk değer verilmeyen statik değişkenleri görürsünüz, mesela `static int beko;` gibi.

### Export Address Table - EAT
İlk inceleyeceğimiz tablo *Export Address Table*. Bu tablo dosyamızın dışarıya aktardığı fonksiyonları içeriyor. Genelde **DLL** dosyalarında dışa aktarılan fonksiyon olduğundan Export tablolarının birinci dereceden ilgisi olan dosyalar DLL dosyaları diyebilirim sanırım. 

İşletim sistemleri bir programı çalıştırmak için hazırlarken o programın kullandığı fonksiyonların adreslerini de programın **IAT**(Import Address Table)'ına yazar. Peki bunu nasıl yapar? Çok basit, çalıştırılmaya hazırlanan programın IAT'ını gezer, belirtilen ve dosya tarafından kullanılan DLL'leri işlemin sanal adres alanına alır böylece bu DLL bizim programımız tarafından ulaşılabilir olur. Ardından bu DLL'lerin Export tablolarını gezerek buradan fonksiyonların adres bilgisini alıp bizim programımızın IAT tablosuna yazar. Böylece siz başka bir dosyada tanımlanmış bir fonksiyon çağırdığınızda programınız kendi IAT tablosunda belirtilen değere bakarak hangi adresi çağırması gerektiğini de öğrenmiş olur.

Devam edersek.. Export tablosu veri dizininin ilk girdisinde(0) yer alıyor. Yapısı şu şekilde:

    typedef struct _IMAGE_EXPORT_DIRECTORY {
        DWORD   Characteristics;        //Genelde kullanılmıyor, 0 değerine sahip
        DWORD   TimeDateStamp;          //Tablonun oluşturulma zamanı
        WORD    MajorVersion;           //Bu ikisi genelde 0
        WORD    MinorVersion;           //..
        DWORD   Name;                   //(ASCII) DLL ismine RVA
        DWORD   Base;                   //Sıra numarasının başlangıcı(Genelde 1)
        DWORD   NumberOfFunctions;      //Kaç tane fonksiyon export edildi?
        DWORD   NumberOfNames;          //Dışa aktarılan toplam fonksiyon isim sayısı
        DWORD   AddressOfFunctions;     //Fonksiyon adreslerine RVA 
        DWORD   AddressOfNames;         //Fonksiyon isimlerine RVA  
        DWORD   AddressOfNameOrdinals;  //Sıra numaralarına RVA 
    } IMAGE_EXPORT_DIRECTORY, *PIMAGE_EXPORT_DIRECTORY;

Buradaki **Name** elemanı önemli. Çünkü eğer biri DLL'in ismini değiştirirse buradaki değere bakılarak asıl ismi belli oluyor. Bunun dışında en önemli olan son 3 eleman. Bunlar birbirine paralel olarak hareket ediyor diyebiliriz. Yukarıda yapıda belirttiğim gibi **AddressOfFunctions** fonksiyon adreslerini tutan bir diziye, **AddressOfNames** fonksiyon isimlerini tutan bir dizeye, **AddressOfNameOrdinals** ise *AddressOfFunctions* dizisine ordinal(sıra) değerlerini tutan bir diziye **RVA** içeriyor. 

**AddressOfFunctions** dizisindeki değer **0**(Sıfır) olabilir. Bu o RVA'ya sahip fonksiyonun kullanılmadığını gösteriyor. Ayrıca şunu da ekleyeyim eğer bu RVA, export tablosunun olduğu yere işaret ediyorsa, bu demektir ki bu bir "*forwarded export*". Bu tür export edilen fonksiyonlar başka bir DLL veya dosyada bulunan bir fonksiyona işaret ederler. Bu nedenle isimleri iletilen/yönlendirilen/sevk edilen ihraç/dışa aktarım olarak anılır. (Türkçe, bilgisayar terimlerine uygun bir dil değil galiba)

**Sıra** değerlerini basitçe fonksiyon adresleri ve fonksiyon isimleri tablolarına bir indeks olarak kullanabiliyorsunuz. Bu sıra değeri **AddressOfFunctions** dizisinde bir indeks belirtiyor. Burada aklınızda bulunması gereken önemli bir nokta şu, hiçbir fonksiyon adı birden fazla fonksiyon adresi için tanımlı olamaz, fakat birkaç tane isim bir adresteki fonksiyona tanımlı olabilir.

Yani, **Name** tablosunda bulunan iki farklı isim fonksiyon adres tablosundaki aynı fonksiyona işaret ediyor olabilir. Yani aynı fonksiyon farklı isimleri kullanıyor demek oluyor bu, aklınızda bulunsun.

Peki bize ismi verilen bir fonksiyonu EAT içerisinde nasıl buluruz? Diyelim ki **muzluCayYap** isimli bir fonksiyonu arıyoruz. Yapmamız gereken şey **AddressOfNames** ve **AddressOfNameOrdinals** dizisinde paralel olarak gezip bu isme sahip girdiyi bulmak. Ardından bulduğumuz girdinin indeksini **AddressOfNameOrdinals** dizisinde kullanarak başka bir indeks değeri elde etmek ve bu indeks değerinden **Base** alanındaki değeri çıkarmak. Son olarak da, bu yeni oluşan indeks değerini **AddressOfFunctions** dizisinde kullanarak , aradığımız fonksiyonun adresini almak. 

Misal, `muzluCayYap` **AddressOfNames** dizisinde **5**. sırada. **AddressOfNameOrdinals**'in **5**. sırasında ise **9** indeksi var(*Base=0* varsayıyorum). `AddressOfFunctions` dizisinde **9**. fonksiyon adresini aldığımızda fonksiyonun adresini ulaşmış oluyüruz.

Daha da formülleştirirsek:

1. indeks    = IsimTablosunuTara(ExportIsmi);
2. ordinal   = ExportOrdinalTable[indeks];
3. fonkAdres = ExportAddressTable[ordinal - Base];

Yine misal, popüler `GetProcAddres()` fonksiyonun yaptığı şey de hemen hemen burada yaptıklarımız gibidir diyebiliriz(Biraz daha paranoyak versiyonu). Bu fonksiyon da kendisine verilen modüldeki export tablosunu ayrıştırarak aradığınız fonksiyonu buluyor.

> Arkadaşlar, yazının şu an için başlangıcına göre yeri tam belli olmayan bir yerinden sesleniyorum. Yaz yaz bitmiyor bu PE yapısı. Böyle giderse birkaç bölümü atlayacam sanırım. 

Fonksiyon adresini bulmaya dair bir başka yöntem(veya ihtimal da diyebiliriz) ise yalnızca **sıra**(ordinal) numarasını kullanarak fonksiyonu bulmak. Bazen export tablosundaki fonksiyonlar sadece sıra numarasına sahip oluyorlar, yani **AddressOfNames** ve **AdressOfOrdinals** dizilerinde girdisi olmuyor. Bu durumda yine elinizdeki sıra numarasından önce **Base** değerini çıkarıyorsunuz. Ardından **AddressOfFunctions** dizisinde bu yeni indeksi kullanıyorsunuz böylece fonksiyonun adresini bulmuş oluyorsunuz.

Şimdi biraz görsellik katalım. Export yapısını görselleştirmemiz gerekirse:

![](/files/exportableDiag.png)

Bir de canlı örnek üzerinden göstereyim. Örneğin `ntdll.dll`'i *IDA* ile açıp, `IMAGE_EXPORT_DIRECTORY` yapısına bakarsak şöyle bir şey göreceğiz.

![](/files/exportTableIDA.png)

Yapıdaki son 3 elemana bakarsanız `off_77E94DD0`, `off_77E9630C`, `word_77E97848` göreceksiniz.(İsimlendirecektim ama sonradan fark ettim, üşendim) İşte bunlar bizim bahsettiğimiz o diziler. **AdressOfNames**(`off_77E9630C`) içerisinden bir fonksiyon seçelim mesela.

![](/files/exportFonksiSectik.png)

Ben `AddAtomW` fonksiyonunu seçtim. Şimdi yapmam gereken şey bu fonksiyon isminin indeksini `AddressOfNameOrdinals` dizisinde kullanarak sıra değerini elde etmek. Dikkat ederseniz `AddAtomW`'in indeks değeri **4**.(0'dan başlıyoruz saymaya). Şimdi bu indeks değerini sıra tablomuzda kullanıp sıra numaramızı bulalım.

![](/files/ordinalSectim.png)

Yine **0**'dan saymaya başlarsak **4** numaralı indeks bize **6** değerini verdi. İşte bu değer bizim `AddressOfFunctions` dizisinde kullanacağımız değer. Şimdi fonksiyon adresinin olduğu dizideki **6**. elemanı görelim bakalım, teorik ve pratik olarak bizim fonksiyonumuzun RVA'sı olması lazım burada.

![](/files/tablodanRVAaldim.png)

Evet, işte burdaymış. Bu arada kenarda gizlenene dikkat ederseniz (NTDLL. ile başlayan) o yukarıda bahsettiğimiz "*forwarded export*"lardan biri. `AcquireSRWLockShare` fonksiyon ismini **NTDLL** içerisindeki bir fonksiyona yönlendiriyor.

### Import Address Table - IAT
Pekiyi buna Türkçe olarak ne derdiniz? İthalat adres tablosu? Kullanılan fonksiyon tablosu? İçe aktarılan adres tablosu? Hiçbiri karşılamıyor gibi hissediyorum o nedenle olduğu gibi bırakmak daha mantıklı geldi.

Bu tablo yine hem dosyalar için hem de işletim sistemi için kilit tablolardan biri. Dosyanın başka bir modülde tanımlanmış hangi fonksiyonları kullandığını gösteriyor. Bu dosyalar başkalarının da kullanabilmeleri için kendi içlerindeki fonksiyonları "*export*" ederler (yukarıda bahsettiğimiz gibi), dışa aktarırlar. Siz de alıp bunları kendi programınızda kullanırsınız.

İşletim sisteminin PE yükleyicisi çalıştığında yaptığı işlemlerden biri de bu tabloyu gezerek gerekli olan diğer **DLL** dosyalarını o an çalışan işlemin(*process*) sanal adres alanına "*map*" etmektir. Bu işlemden sonra ise **IAT** tablosundaki fonksiyon adres değerleri yine yükleyici tarafından gerekli ayrıştırılmalar yapılıp(fonksiyon adreslerinin bulunması gibi) doldurulur böylece bu fonksiyonlar kullanılabilir hâle gelmiş olur. 

Yani, **IAT** tablosundaki adresler dosya hafızaya yüklenirken doldurulur. Bu da demektir ki <u>diskteki</u> bir dosya için **IAT** tablosunda geçerli bir değer bulamıyorsunuz, buradaki değerler bağlayıcı için de bir adres ifade etmiyor. (Tabi bir istisna var, o konuya gelecem birazdan.)

Veri dizininde 1. sırada bulunan ve `IMAGE_IMPORT_DESCRIPTOR` yapısı ile belirtilen bu alana ulaştığınızda dosyanın kullandığı ilk **DLL** ile ilgili bilgiye de ulaşmış oluyorsunuz. <u>Dosyanın kullandığı her DLL için bu yapıdan bir tane bulunmaktadır.</u> Yapı aşağıdaki gibi:

    typedef struct _IMAGE_IMPORT_DESCRIPTOR {
        union {
            DWORD   Characteristics;      // null import descriptor için 0
            DWORD   OriginalFirstThunk;   // INT RVAsı (IMAGE_THUNK_DATA)
        } DUMMYUNIONNAME;
        DWORD   TimeDateStamp;            // bound import değilse 0.
        DWORD   ForwarderChain;           // ??
        DWORD   Name;                     // DLL'nin ASCII olarak ismi(Null sonlandırıcı içeriyor)
        DWORD   FirstThunk;               // IAT tablosuna RVA (bound kullanılıyorsa IAT asıl adresleri içerir)
    } IMAGE_IMPORT_DESCRIPTOR;

Ardından bu yapının **FirstTrunk** elemanın gösterdiği değer ile *IAT* tablosuna, **OriginalFirstTrunk** elemanının gösterdiği değer ile ise *INT* tablosuna ulaşmış oluyorsunuz. Bu iki yapı birbirine paralel devam etmektedir. Bu da bize büyük kolaylık sağlıyor.. Bu iki elemanın gösterdiği yerler ise **IMAGE_TRUNK_DATA** yapısıyla tanımlanır ve **DLL**'den içeri aktarılan her fonksiyon için ayrı ayrı 2 adet **IMAGE_TRUNK_DATA** yapısı bulunur. Bunlar aradaki fark şudur, eğer **FirstTrunk** kullanırsanız bu yapıdaki **Function** girdisi sizin import ettiğiniz fonksiyonun *RVA* değerine, eğer **OriginalFirstTrunk** kullanırsanız bu yapıdaki **AddrOfData** girdisi **IMAGE_IMPORT_BY_NAME** yapısına işaret eder, bu yapıdaki **Name** elemanı ise size kullanılan fonksiyonun ismini verir. **IMAGE_TRUNK_DATA** ve **IMAGE_IMPORT_BY_NAME** yapısı da şu şekilde(union'a dikkat):

    typedef struct _IMAGE_IMPORT_BY_NAME {
        WORD    Hint;  //AddressOfNames indeksi
        CHAR    Name[1];
    } IMAGE_IMPORT_BY_NAME, *PIMAGE_IMPORT_BY_NAME;

    typedef struct _IMAGE_THUNK_DATA {
        union {
            DWORD ForwarderString;      // PBYTE 
            DWORD Function;             // PDWORD
            DWORD Ordinal;              // Ordinal mi?
            DWORD AddressOfData;        // IMAGE_IMPORT_BY_NAME
        } u1;
    } IMAGE_THUNK_DATA;

Import tablosunu inceleme sırasında döngü kurarken yapmanız gereken mesela **FirstTrunk** alanının *NULL* olup olmadığına bakmak(Diğerleri de olur). Çünkü birbirinin takip eden bu **IMAGE_IMPORT_DESCRIPTOR** yapılarının en sonuncusu NULL(0) ile dolu bir yapı içerir, bu sayede sona geldiğinizi de anlayabilmiş olursunuz.

Ayrıca buradaki **Ordinal** değerini **IMAGE_ORDINAL_FLAG**(`80000000h`) sabitiyle kıyaslayarak bu fonksiyonun sıra numarası ile mi tanımlandığını anlayabilirsiniz. Bu sabit **Ordinal** değerinin yüksek değerli bitini test etmek için kullanılıyor. Eğer bu bit tanımlı ise bu fonksiyon ordinal değeriyle çağırılıyor demektir. 

Sadece şunu unutmayın ki buradaki tüm değerler **RVA** olarak veriliyor. Eğer hafızada iş yapıyorsanız sıkıntı yok, fakat diskte yapıyorsanız bunları disk offsetine çevirmeyi unutmayın.

Bir de eklemek istediğim "*bound import*" kaldı. Hatırlarsanız "*IAT tablosundaki adresler dosya hafızaya yüklenirken doldurulur*" demiştik. Bound import denilenler ise işte bu durumu geçersiz kılıyor. Peki nasıl?

Normalde PE yükleyici gereken **DLL**'yi hafızaya alır, onun **EAT**'ını  bulur, kullanılacak fonksiyonun RVA bilgisini bu EAT içinde bulur ve ardından bulduğu fonksiyon adresini bizim dosyamızın IAT'a yazar. Oysa **bound import** kullanırsanız tüm bunlar ortadan kalkıp IAT tablosu bağlayıcının çalıştığı sırada gerçek fonksiyon adresleri ile doldurulur. Fakat önemli bir nokta var. Bu değerler hep sabit olduğu düşünülerek doldurulacağı için, yani hard-coded olacağı için eğer fonksiyon adreslerinde, yani aslında kullanılan DLL dosyasında bir değişme olursa fonksiyonlar da çağırılamayacaktır.

PE yükleyici IAT' ın bound olup olmadığını test etmek için `IMAGE_IMPORT_DESCRIPTOR` yapısındaki **TimeDateStamp** elemanına bakar. Eğer bu değer 0 ise import tabloları bound olmaz. 0'dan başka bir değer olması durumunda ise import tablolarına gerçek fonksiyon adresleri yazılıyor demektir(Yani bound import oluyor demektir). Bu durumda devreye `IMAGE_DIRECTORY_ENTRY_BOUND_IMPORT` isimli başka bir yapı giriyor ve doğrulama için alınan **TimeDateStamp**  bu yapıdan alınıyor:

    typedef struct _IMAGE_BOUND_IMPORT_DESCRIPTOR {
        DWORD   TimeDateStamp;                  //Kullanılan DLL'in bound oluştuturkenki zamanı
        WORD    OffsetModuleName;               //Kullanılan DLL ismine offset(RVA değil)
        WORD    NumberOfModuleForwarderRefs;    //Forward edilen dll için
    } IMAGE_BOUND_IMPORT_DESCRIPTOR,  *PIMAGE_BOUND_IMPORT_DESCRIPTOR;

Bu yapı IAT'daki bound import olan her DLL için 1 tane oluyor. Bu bound tanımlayıcılarına ulaşmak için ise veri dizininde **IMAGE_DIRECTORY_ENTRY_BOUND_IMPORT** sabitiyle belirtilen sıralanmış yapılara ulaşmanız gerekiyor. Tabi burada biter mi? Bitmez. Adamlar öyle bir dosya yapısı yapmış ki "*anlata anlata bitiremiyorsun.*" 

Bu arada not geçeyim, yapıda gördüğünüz **NumberOfModuleForwarderRefs** girdisi dosyadaki "*forward*" edilmiş fonksiyonlar için `IMAGE_BOUND_FORWARDER_REF` yapısını içeriyor.  O da şöyle:

    typedef struct _IMAGE_BOUND_FORWARDER_REF {
        DWORD   TimeDateStamp;           //Yazıldığı sıradaki tarih
        WORD    OffsetModuleName;        //DLL ismi
        WORD    Reserved;
    } IMAGE_BOUND_FORWARDER_REF, *PIMAGE_BOUND_FORWARDER_REF;

"*Forward*" olmayanlar için, PE yükleyici kullanılacak olan **DLL**'in `IMAGE_FILE_HEADER` başlığında bulunan **TimeDateStamp** değeri ile `IMAGE_BOUND_IMPORT_DESCRIPTOR` içinde bulunan **TimeDateStamp** karşılaştırarak dosyanın değişip değişmediğini kontrol ediyor. (Eğer fonksiyon "*forward*" edilmiş ise bu defa `IMAGE_BOUND_FORWARDER_REF` içindeki **TimeDateStamp** ile kullanılan DLL'in `IMAGE_FILE_HEADER` başlığındaki **TimeDataStamp**'ı karşılaştırıyor.) Eğer değer değişmiş ise veya dosya istenilen alana yerleştirilemeyip relocation işleminden geçmiş ise PE yükleyici dosyanın "*bound*" IAT'ının geçerli olmadığını anlayıp **IAT** tablosunu tekrar inşa ediyor.

Mesela `kernel32.dll` içindeki `HeapAlloc` fonksiyonu `ntdll.dll` içindeki `RtlAllocateHeap` fonksiyonuna yönlendirilmiş durumdadır. Eğer yazdığımız bir uygulama `HeapAlloc` fonksiyonunu kullanıyorsa ve bu dosyanın IAT'ı bound ise, dosyamızda `kernel32.dll` için bir tane `IMAGE_BOUND_IMPORT_DESCRIPTOR` ve `ntdll.dll`'e yönlendirme olduğu için bir tane de `IMAGE_BOUND_FORWARDER_REF` olacaktır.

Bu anlattıklarımı görsel bir hâlde sunarsak aşağı yukarı şöyle bir şey oluyor. (Bound durumunu katmadım, nasıl sığdırayım?)

![](/files/importTableDiag.png)

Örneğin bir de canlı kanlı görmek gerekirse **IDA** ile bakalım. Mesela `IMAGE_IMPORT_DESCRIPTOR` alt alta sıralı olduğunu söylemiştik. Bakalım öyle miymiş?

![](/files/importdescIDA.png)

Bakın gördüğünüz gibi programın kullandığı her **DLL** için bir `IMAGE_IMPORT_DESCRIPTOR` tablosu var. Şimdi buradaki Import Address Table kısmını takip edersek bu **DLL** tarafından sağlanan kullandığımız fonksiyonların adreslerini de görebiliriz. Ayrıca Import Name Table(Import Lookup Table diye de geçer) kısmını takip edip `IMAGE_IMPORT_BY_NAME` yapısına da ulaşabilirsiniz(Fonksiyon isimlerini almak için). Şimdi `kernel32.dll`'nin **IAT** girdilerini görelim.

![](/files/kernel32importlar.png)

Burada yine gördüğünüz peşpeşe olan yapılar aslında bizim `IMAGE_TRUNK_DATA` dediğimiz yapılar. Burada dikkat etmeniz gereken şey <u>fonksiyonların adres bilgilerinin henüz olmadığı</u>. Çünkü yazının bir yerinde(nerde hatırlamıyorum, *CTRL+F*) dediğim gibi bu tablo program hafızaya yüklenmeye başladığı zaman işletim sisteminin PE yükleyicisi tarafından dolduruluyor. Örneğin aynı programı çalıştırdıktan sonra bu alana bakarsak şunu görürüz:

![](/files/kernel32imponmem.png)

Bu defa gördüğünüz gibi fonksiyonların adresleri gereken yerlere koyulmuş. İşte bunu işletim sisteminin PE yükleyici gerçekleştiriyor. Kullanıcı modu(User-Mode) tarafındaki birçok taklayı da bu tabloyu kullanarak atabiliyorsunuz. Mesela buradaki bir fonksiyonun adresi, sizin belirleyeceğiniz bir adres ile değişse ne olur? IAT Kancalama olur ehehe. Bunun nasıl yapılabileceği gibi ayrıntılara girmiyorum lakin bunların iyi niyetle kullanılacağından pek emin değilim.

### Resource Dizini

Resource dediğimiz "*şeyler*" mesela programın içerisindeki **resim**, **menü**, **diyaloglar** ve hatta <u>başka bir program</u> gibi "*şeyleri*" kapsıyor. Windows'un sunduğu bazı fonksiyonlar ile burada bulunan "*şeyler*"'e ulaşabiliyor, dışarı aktarabiliyorsunuz.

Resource kısmına ulaşmak için veri dizininin **IMAGE_DIRECTORY_ENTRY_RESOURCE** sabiti ile belirtilen girdisine bakabilirsiniz. Buradan **VirtualAddress** değerini alırsanız `IMAGE_RESOURCE_DIRECTORY` ile tanımlanan bir yapıya ulaşmış oluyorsunuz, o da şöyle:

    typedef struct _IMAGE_RESOURCE_DIRECTORY {
        DWORD   Characteristics;       //Rezerve
        DWORD   TimeDateStamp;         //Resourceun oluşturulduğu tarih
        WORD    MajorVersion;      
        WORD    MinorVersion;
        WORD    NumberOfNamedEntries;  //İsme sahip girdi sayısı
        WORD    NumberOfIdEntries;     //IDye sahip girdi sayisi
        //IMAGE_RESOURCE_DIRECTORY_ENTRY DirectoryEntries[];
    } IMAGE_RESOURCE_DIRECTORY, *PIMAGE_RESOURCE_DIRECTORY;

Dikkat ederseniz bu yapıda herhangi bir veriye gösterici içeren bir eleman yok. Fakat son 2 eleman dikkat çekici. Bunlardan biri kaç adet **ismi** olan resource girdisi olduğunu, diğeri ise kaç tane **ID** ile belirtilen resource girdisi olduğunu belirtiyor. *Bu girdiler yine hemen bu yapının devamında bulunuyorlar* (**DirectoryEntries** hayali elemanına bakınız).  **İsme** sahip olanlar **ID** ile belirtilenlerden önce geliyor. Toplamda ise `NumberOfNamedEntries + NumberOfIdEntries` kadar `IMAGE_RESOURCE_DIRECTORY_ENTRY` yapısı, bu `IMAGE_RESOURCE_DIRECTORY` yapısının sonrasında duruyor. Bahsettiğim yeni yapı işe şöyle:

    typedef struct _IMAGE_RESOURCE_DIRECTORY_ENTRY {
        union {
            struct {
                DWORD NameOffset:31;
                DWORD NameIsString:1;
            } DUMMYSTRUCTNAME;
            DWORD   Name;
            WORD    Id;
        } DUMMYUNIONNAME;
        union {
            DWORD   OffsetToData;
            struct {
                DWORD   OffsetToDirectory:31;
                DWORD   DataIsDirectory:1;
            } DUMMYSTRUCTNAME2;
        } DUMMYUNIONNAME2;
    } IMAGE_RESOURCE_DIRECTORY_ENTRY, *PIMAGE_RESOURCE_DIRECTORY_ENTRY;

Bu girdilerde gezinmek iç içe klasörlerde gezinmeye benziyor diyebiliriz.(Ya da gavurun söyleyişiyle ağaca) Öncelikle bir adet *root directory* adı verilen dizin var. Bu dizinin içinde her resource tipi için ayrı bir dizin girdisi daha oluyor(1=Type). Bu dizin girdilerinde ise yine kendisine ait resource isimlerini belirten alt dizin girdileri oluyor. Bu alt dizin girdileri ID veya Name belirtecine sahip oluyorlar ve yine başka bir alt dizin içeriyorlar(2=Name/ID). Bu diğer alt dizinler ise o resourceun farklı dillerde olabilmesine olanak sağlıyor(3=Language). Yani eğer resource 3 dallanma yaşıyorsa, 3 tane yuvalı döngüyle hepsini alabilirsiniz. Örnek olarak: (Kod gerekirse mail ile haber edin)

![](/files/resourceKodOrnek.png)

En sonunda her dil girdisinde bir adet resource entry oluyor, bu işte bizim final noktamız, yani resourcenin olduğu kısım oluyor. Tabi her zaman 3 dallanmayla olacak diye bir şey yok. Bu tamamen resource yapısına bağlı olan bir şey..

Üstte gösterdiğim `IMAGE_RESOURCE_DIRECTORY_ENTRY` yapısında 2 bölüm önemli diyebiliriz. **Name** ve **OffsetToData**. Fakat, bunların bize ne belirttiğini anlamak için diğer alanlara da bakmamız gerekiyor (*union* tanımlara dikkat edin).

Örneğin resourceların isimlerdirmesi sırasında, eğer buradaki **Name** alanımızda **ID** yerine bir *string* varsa, yani resource bir isme sahipse, **NameIsString** alanı **1** yapılıyor ve **NameOffset** alanımız ise bize `IMAGE_RESOURCE_DIRECTORY_STRING ` isimli bir yapıya **RVA** içeriyor. Bu yapıda bu kaynağın ismi ve isminin uzunluğu yer alıyor. 

Diğer durumda ise bizim **NameIsString** alanımız **0** oluyor(Genelde root dizininde böyle olur), ve düşük değerli 16 bitlik kısım(yani **Id**) kısmı bize buranın **ID**'sini veriyor.

Her iki durumda da eğer girdi başka bir resource dizini ise **DataIsDirectory** değeri **1** yapılıyor ve **OffsetToDirectory** bize bu alt dizinin resource dizininin başlangıcından itibaren uzaklığı veriyor(Böylece ortaya yeni bir `IMAGE_RESOURCE_DIRECTORY` çıkıyor). Aksi durumda, yani, **DataIsDirectory** değeri **0** ise **OffsetToData** değeri `IMAGE_RESOURCE_DIRECTORY_ENTRY` yapısına uzaklığımızı veriyor.

Ulaştığımız alt `IMAGE_RESOURCE_DIRECTORY_ENTRY` yapısında ise ya yeni bir `IMAGE_RESOURCE_DIRECTORY` dallanması yaşıyor, ya da yine `IMAGE_RESOURCE_DIRECTORY_ENTRY` yapısına ulaşıyoruz. Bunu yukarıda bahsettiğim diğer değerleri kontrol ederek anlıyoruz.

En son olarak bu dizinlerin son dallanmasında karşımıza resource'ları tanımlayan `IMAGE_RESOURCE_DATA_ENTRY` yapısı geliyor. Bu yapıda ise **OffsetToData** kısmı size bu resource'un içeriğini, **Size** ise boyutunu veriyor.

Şimdi bu bahsettiğim yapıları gösterip, olayı görselleştirelim. 

    //Bunun Unicode versiyonu da var
    typedef struct _IMAGE_RESOURCE_DIRECTORY_STRING {
        WORD    Length;
        CHAR    NameString[ 1 ];
    } IMAGE_RESOURCE_DIRECTORY_STRING, *PIMAGE_RESOURCE_DIRECTORY_STRING;

    typedef struct _IMAGE_RESOURCE_DATA_ENTRY {
        DWORD   OffsetToData;
        DWORD   Size;
        DWORD   CodePage;
        DWORD   Reserved;
    } IMAGE_RESOURCE_DATA_ENTRY, *PIMAGE_RESOURCE_DATA_ENTRY;

Görsel hâli ise özetle şöyle oluyor diyebiliriz:

![](/files/resourceDizinibu.png)

Opps, bir de son olarak burada bulunabilecek sık görülen resource tipleri de şu şekilde tanımlı durumda haberiniz olsun:

    #define RT_CURSOR           1
    #define RT_BITMAP           2
    #define RT_ICON             3
    #define RT_MENU             4
    #define RT_DIALOG           5
    #define RT_STRING           6
    #define RT_FONTDIR          7
    #define RT_FONT             8
    #define RT_ACCELERATOR      9
    #define RT_RCDATA           10
    #define RT_MESSAGETABLE     11
    #define RT_GROUP_CURSOR     12
    #define RT_GROUP_ICON       14
    #define RT_VERSION          16         

### Relocation

**Relocatio**n dizini dediğimiz şey dosyanın PE Optional başlığında bulunan **ImageBase** alanına yüklenemediği zamanlarda dosyanın yeniden yerleştirme işleminin yapılabilmesi için gereken bilgileri içerir. Bu bilgilere **Base Relocation** adı veriliyor. Dosyanın içinde bulunan belli adreslerin(mesela statik değişkenler, stringler gibi), dosya beklenilen alana yüklenemediği zamanlarda tekrar belirlenmesi gerektiği için bu base relocation bilgileri kullanılarak tekrar yerleştirme işlemi yapııyor.

Relocation dizini dosyadaki her **4KB**'lık kısım için `IMAGE_BASE_RELOCATION` ile tanımlanan Base relocation girdileri içerir.(Sonuncu girdide **VirtualAddress** 0 olur) Bu girdiler tanımladığı **4KB**`lık alanın, modülün istenilen adrese yüklenememesi durumunda uygulanması gereken tekrar yerleştirme bilgilerini içerir.

    typedef struct _IMAGE_BASE_RELOCATION {
        DWORD   VirtualAddress;
        DWORD   SizeOfBlock;
    } IMAGE_BASE_RELOCATION;

Buradaki **VirtualAddress** kısmı **4KB**'lık alanın RVA'sını, **SizeOfBlock** ise bu alan için kullanılacak olan relocation kaydı girdilerinin boyutunu içerir. **SizeOfBlock**'un içerdiği değeri kullanarak bu sayfaya işaret eden kaç adet relocation kaydı olduğunu tespit edebilirsiniz.

Bunun için `(SizeOfBlock-sizeof(IMAGE_BASE_RELOCATION))/sizeof(RELOC_RECORD)` formülünü kullanabiliriz. Bu sayede bu kayıtları gezebilecek duruma da gelmiş oluruz. 

Şimdi.. Bu 16 bitlik kayıtlar hemen `IMAGE_BASE_RELOCATION` girdisinden sonra geliyor ve yapıları ise şöyle:

    typedef struct _RELOC_RECORD {
        WORD offset:12;
        WORD type:4;
    }RELOC_RECORD;

**offset** kısmı bizim yeniden yerleştirme uygulanacak alanımızı, **type** ise bu yeniden yerleştirmenin tipini gösteriyor. Yeniden yerleştirme tiplerine burada çok girmeyecem, zaten açıkçası muhtemelen bu relocationlar ile uğraştırmanızı gerektirecek çok az durum olacak. Belki bir PE loader yazarsanız o zaman lazım olur.. Fakat şunu söyleyebilirim, benim gördüğüm en çok kullanılan tip `IMAGE_REL_BASED_HIGHLOW`, yani **3** değeri. Bu da tüm yeniden yerleştirme değerinin etki edeceğini gösteriyor. Bu konuyu birazcık açalım.

Gereken testleri yapıp PE dosyasının **ImageBase** kısmında belirtilen yere <u>yüklenmediğini</u> gördüğünüz zaman yapmanız gereken şey <u>dosyanın yüklediği yer ile **ImageBase** arasındaki farklı hesaplayıp, relocation girdilerinde verilen **offset**lere bu farkı eklemek</u>. Böylece relocation işlemi de sağlanmış oluyor. **Type** kısmındaki **3** değeri de bu hesapladığınız farkın, 32 bitinin de kullanılmasını sağlıyor. Bir de düşük veya yüksek 16 bitini kullanan tipler var, fakat kullanıldığına hiç rastlamadım.

Relocation kısmı için şöyle bir görsel ve bir de programsal(ehehe) örnek gösterirsem sanırım daha anlaşılır olacak. (RVA dönüşümlerini unutmayın eğer diskte çalışıyorsanız)

Aşağıda `ntdll.dll` için belirtilen relocation bilgilerini görüyorsunuz.

![](/files/ntdllReloclari.png)

Mesela ilk kutucukta gördükleriniz bizim `IMAGE_BASE_RELOCATION` girdilerimiz. Misal 2. girdiyi aldığımızda onun içinde bulunan `RELOC_RECORD`'ların alttaki kutucukta görebiliyoruz. Mesela `2025` offsetinde `HIGHLOW`(3) tipi kullanılarak bir relocation yapılacak diyebiliriz. Ha, buradaki `2025` sayfa adresinin eklenmiş hali onu da söylemiş olayım. Normalde orada buradaki duruma bakarsak `3025` değeri bulunur. Bunun baştaki 4 biti(yani **3** değeri) reloc kaydının tipini belli ederken, geri kalan 12 bit(yani** 025**) de sayfa içindeki offseti belli ediyor, hâliyle sayfa adresini ekleyince değerimiz `2025` oluyor.

Biraz daha psikopatlaşmak gerekirse, Value kısmında gördüğünüz `7c9020a0` değeri bizim tekrar yerleştirmeye uğrayacak verimiz. Bu adreste ne olduğuna bakarsanız (modül hafızaya yüklendikten sonra) neyin yeri hakkında değişiklik yapacağımızı da görebilirsiniz.

    .text:7C9020A0 off_7C9020A0    dd offset loc_7C9020B0  ; DATA XREF: memcpy+1BC
    .text:7C9020A0                                         ; memcpy:loc_7C901F9C
    .text:7C9020A0                                         ; jump table for switch statement
    .text:7C9020A4                 dd offset loc_7C9020B8  ; jumptable 7C901F9C case 1
    .text:7C9020A8                 dd offset loc_7C9020C8  ; jumptable 7C901F9C case 2
    .text:7C9020AC                 dd offset loc_7C9020DC  ; jumptable 7C901F9C case 3

Aşağıdaki kısa kod parçası ise, eğer relocation işlemini kendiniz yapmak isterseniz(pe loader yazdınız mesela) nasıl bir yol izlemeniz gerektiğine dair biraz yardımcı olacaktır diye tahmin ediyorum.

    //Relocation tablosunun adresini ve kendisini alalım
    relocAddr  = fileBase + NtHeader->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_BASERELOC].VirtualAddress;
    relocTablo = (PIMAGE_BASE_RELOCATION)relocAddr;

    //relocTablo'dan sonra gelen ilk RELOC_RECORD yapısı
    PRELOC_RECORD relocRec = (PRELOC_RECORD)(relocAddr + sizeof(IMAGE_BASE_RELOCATION));

    //İlk 4KBlık sayfa RVAsını alıyoruz, burada relocation işlemi yapılacak
    DWORD sayfa = fileBase + relocTablo->VirtualAddress;
    //Kaç tane RELOC_RECORD girdisi var?
    DWORD toplamReloc = (relocTablo->SizeOfBlock - sizeof(IMAGE_BASE_RELOCATION)) / sizeof(RELOC_RECORD);

    //Şimdi tüm RELOC_RECORD girdilerini gezip, gereken ayarlamayı yapalım
    for (int i=0; i <= toplamReloc; i++)
    {
        DWORD hedef;

        //Dikkat edin RELOC_RECORD'dan aldığımız offset'i sayfaya ekliyoruz
        //Bu offset zaten bu sayfa içindeki yeri gösteriyor.
        hedef = sayfa + relocRec[i].offset;

        //Dikkat edin, 'hedef'i değil, hedefin gösterdiği yeri değiştiriyoruz
        //ImageBaseSuAnFark bahsettiğim dosyanın yüklendiği yer ile ImageBase farkı
        //Ayrıca tip değerini kontrol etmedim, direk 3 olarak kabul ettim buna da dikkat!
        *(DWORD *)(hedef) += ImageBaseSuAnFark; //Boyle degisken ismi olur mu?
    }

Ben yalnızca 1 tane `IMAGE_BASE_RELOCATION` girdisini nasıl ayrıştırıp kullanacağınız gösterdim burda. Tüm girdileri yapmanız gerektiği için misal bir **while** döngüsü kurup, son `IMAGE_BASE_RELOCATION` girdisini bulana kadar (yani **0** değerini bulana dek) kadar devam ederseniz böylece hepsini gezebilmiş olursunuz. (Sonraki Base Relocation yapısına geçmek için şu ankine yine şu ankinin **SizeOfBlock** değerini eklemeniz gerek.)

Sanırım bu kadar.. Burdaki bilgileri kullanıp kendi PE inceleyicinizi yazmak da artık size kalıyor.

Bunların dışında yazmak istediğim bir iki ayrıntı daha vardı. (PE'de olan ama benim yazmayı düşünmediğim birçok [ayrıntı](https://msdn.microsoft.com/en-us/windows/hardware/gg463119.aspx) var) Fakat artık hakkaten sıkıldım ehehe. Yaz yaz bitmiyor, bir gün kendimde güç bulursam bu yazıyı tekrar gözden geçirip, eksiklerini tamamlayıp PE yapısını az-çok anlatabilmiş bir makale yapmayı umuyorum.

Aa, bir de açıkçası çok kopuk konularla uğraşırken yazdım bu yazıyı. Yazının bazı yerlerinde hiç alakası olmayan şeylerden bahsetmiş olabilirim, bu nedenle yazıda hatalar olduğuna eminim, yakalayanlar haber etsinler onları da düzeltmiş olurum.

Bir şey daha ekleyecem. Ben çoğu yazıyı o an kafama hangisi eserse, hangisine istek duyarsam ona göre yazıyorum. Çoğu yazıda anlatılmasını istediğiniz konuları bildirirseniz yazmaya çalışacağımı belirttim fakat şimdiye kadar aldığım mail/istek sayısı : 0. Acaba yazıları kendim yazıp kendim mi okuyor(muy)um? Neyse..

Sevgiler..
