---
layout: post
title: PE Başlığı ve Export Table
categories: Bilgisayar
---

Çalıştırılabilir bir dosyanın yapısını anlamak tersine mühendislik ile ilgilenecek insanlar için gerçekten önemli bir konu. Bu yazı, bu çalıştırılabilir dosyaların başlıkları hakkında olacak diye umuyorum.

PE başlığı çalıştırılabilir dosyanın yapısı hakkında kritik bilgiler içerir fakat bu başlıklar yalnızca PE başlığından oluşmuyor. Örneğin Windows işletim sistemlerinde her dosya öncelikle *DOS başlığı* ile başlar. Bu işletim sistemlerinin geriye dönük uyumluluğu için gereken bir durum, bu sayede çalıştırılabilir dosyalar eski(DOS) sistemlerde de çalışabiliyor tabii bir hata mesajı vererek çalışamayacağını söyleyerek yani şu mesaj:

> This program cannot be run in DOS mode.

Bunu sağlayan her çalıştırılabilir dosyada bulunan **16** bitlik DOS programı. Yalnızca bu değil, çalıştırılabilir dosyalar bazı alanlara ayrılmış durumdadır. Şu resimde görülebileceği üzere:

![](/files/pe-header.jpg)

Açıklamalara geçmeden önce **RVA** kavramından bahsedelim. Söylediğimiz üzere PE başlığı bölümlerden oluşuyor ve burada tutulan bilgilere ulaşabilmek için bir adrese ihtiyacımız var işte RVA bize bunu veriyor. **PE** yine kendi içerisinde belirtilen bir adrese yükleniyor ve siz başık içerisinden bir değere erişmek istediğinizde *PE* adresine bu RVA değerini ekliyorsunuz basitçe.

### Dos Başlığı (64 BYTE)
Dos başlığı bahsettiğimiz gibi geriye dönük uyumu sağlamak için dosyada bulunuyor ve içerisinde *IMAGE_DOS_HEADER* adı verilen bir yapı ile aşağıdaki değerler tutuluyor.

    typedef struct _IMAGE_DOS_HEADER {  // DOS .EXE header
        USHORT e_magic;         // Magic number
        USHORT e_cblp;          // Bytes on last page of file
        USHORT e_cp;            // Pages in file
        USHORT e_crlc;          // Relocations
        USHORT e_cparhdr;       // Size of header in paragraphs
        USHORT e_minalloc;      // Minimum extra paragraphs needed
        USHORT e_maxalloc;      // Maximum extra paragraphs needed
        USHORT e_ss;            // Initial (relative) SS value
        USHORT e_sp;            // Initial SP value
        USHORT e_csum;          // Checksum
        USHORT e_ip;            // Initial IP value
        USHORT e_cs;            // Initial (relative) CS value
        USHORT e_lfarlc;        // File address of relocation table
        USHORT e_ovno;          // Overlay number
        USHORT e_res[4];        // Reserved words
        USHORT e_oemid;         // OEM identifier (for e_oeminfo)
        USHORT e_oeminfo;       // OEM information; e_oemid specific
        USHORT e_res2[10];      // Reserved words
        LONG   e_lfanew;        // File address of new exe header
    } 

Burada hepsini açıklayamayız tabi, önemli elemanlardan olan **e__magic** dosya formatının doğrulanması için gereken sihirli numarayı tutuyor ve bu **M** ve **Z** harflerinin ascii karşılığı olan `4D 5A` şeklinde oluyor. Son 4 byte yani **e__lfanew** ise PE header'ın başlangıcı gösteriyor.

Dos stub olarak adlandırlan kısım ise bahsettiğimiz hata mesajını ekrana yazmayı sağlayan programı barındırıyor.

### PE Başlığı
PE başlığı tıpkı DOS başlığı gibi kendine ait bir yapıya sahiptir. Bu yapı aşağıdaki şekilde tanımlanmıştır.

    typedef struct _IMAGE_FILE_HEADER {
        WORD    Machine;
        WORD    NumberOfSections;
        DWORD   TimeDateStamp;
        DWORD   PointerToSymbolTable;
        DWORD   NumberOfSymbols;
        WORD    SizeOfOptionalHeader;
        WORD    Characteristics;
    }

Düşüneceğinizin aksine bu başlık DOS başlığından sonra gelmek zorunda değildir. DOS başlığının `0x3c` offsetinde bulunan e_lfanew bize PE başlığının adresini vermektedir. Örneğin Windows 8.1 işletim sisteminde çalışan örnek programının DOS header bilgilerine bakalım, öncelikle programı WinDbg ile açarak `lm` komutunu kullanıp hafızadaki yerini öğreniyoruz. Bu örnekte program `0040000` adresinde:

    kd> dt nt!_IMAGE_DOS_HEADER 00400000
    ntdll!_IMAGE_DOS_HEADER
        +0x000 e_magic          : 0x5a4d
        ---snip---
        +0x03c e_lfanew         : 0n216

Gördüğünüz gibi sihirli değerimiz(*2 byte*) ve *PE*    başlığının bulunduğu kısım belirtilmiş. Aynı şekilde bu dosyanın *PE* başlığı bilgilerine bakalım. Bunun için *PE header*'ın adresini hesaplamamız gerek, lfanew'de belirtilen değer *216* ayrıca bir de PE header'ın sihirli numarası var *4* byte uzunluğunda toplamda **220** decimal yapıyor, hex'e çevirirsek bu **DC** yapar, bakalım.

    0:001> dt nt!_IMAGE_FILE_HEADER 004000DC
    ntdll!_IMAGE_FILE_HEADER
       +0x000 Machine          : 0x14c
       +0x002 NumberOfSections : 4
       +0x004 TimeDateStamp    : 0x3e016030
       +0x008 PointerToSymbolTable : 0
       +0x00c NumberOfSymbols  : 0
       +0x010 SizeOfOptionalHeader : 0xe0
       +0x012 Characteristics  : 0x10f

Dediğim gibi **PE** başlığının da kendine has bir sihirli numarası vardır. *P* ve *E* harflerinin ascii karşılığı olan `50 45` *PE* başlığının en üstünde bulunur (*4 Byte* uzunluğunda). Ardından yukarıda yapısı görünen **20** bytelık *IMAGE_FILE_HEADER* kısmı bulunuyor.

*NumberOfSections* programın içerisinde bulunan toplam sections sayısını verir. En fazla 96 section bulunabilir.

Şimdi, bu yapıdaki *Machine* alanı programın çalışacağı sistemin türünü belirtiyor. Alabildiği farklı değerler var örneğin buradaki **14c** bu programın *i386* veya üstü bir makinede çalışacağını gösteriyor.

*TimeDateStamp* kısmında bu dosyanın oluşturulmasının **01/01/1970** tarihinden sonra geçen saniye biçiminden sayı tutulmaktadır.

*SizeOfOptionalHeader* bu kısımda hemen bu alanın ardında bulunan *IMAGE_OPTIONAL_HEADER*'ın uzunluğu bulunmaktadır.

Arada kalan PointerToSymbolTable ve NumberOfSymbols yalnızca COFF dosya formatında bi anlam içerir, son alan olan Characteristics kısmı ise dosya ile ilgili bazı önemli bilgileri bitsel olarak içerir.

Örneğin bu kısımları daha rahat bir şekilde Olly'de görebilirsiniz.

    004000D8    50 45 00 00>ASCII "PE"           ; PE signature (PE)
    004000DC    4C01        DW 014C              ; Machine = IMAGE_FILE_MACHINE_I386
    004000DE    0400        DW 0004              ;  NumberOfSections = 4
    004000E0    3060013E    DD 3E016030          ;  TimeDateStamp = 3E016030
    004000E4    00000000    DD 00000000          ;  PointerToSymbolTable = 0
    004000E8    00000000    DD 00000000          ;  NumberOfSymbols = 0
    004000EC    E000        DW 00E0              ;  SizeOfOptionalHeader = E0 (224.)
    004000EE    0F01        DW 010F              ;  Characteristics = EXECUTABLE_IMAGE|32BIT_MACHINE|RELOCS_STRIPPED|LINE_NUMS_STRIPPED|LOCAL_SYMS_STRIPPED
    004000F0    0B01        DW 010B              ; MagicNumber = PE32
    ---snip---

PE header kısmının optional kısmında bir çok alan olduğundan burada uzatmayacağım merak edenler yazının en altından ulaşabilirler.

### Import ve Export Tabloları
Şimdi bu iki tablodan bahsetmeden önce bunların nerede tutulduğunu bi görelim. PE Optional header'ın en sonunda *IMAGE_DATA_DIRECTORY* türünde bir eleman bulunmaktadır. Bu arkadaşın yapısı şöyle:

    0:000> dt _IMAGE_DATA_DIRECTORY
    ntdll!_IMAGE_DATA_DIRECTORY
       +0x000 VirtualAddress   : Uint4B
       +0x004 Size             : Uint4B

Buradaki *VirtualAddress* kısmı bu tabloların adresini *Size* kısmı da boyutunu tutmaktadır. Örneğin ntdll.dll dosyasının tablosuna *Detect It Easy* yardımıyla bir bakalım.

![](/files/datadirectory-1.png)

Burada bizim bakacağımız iki kısım *EXPORT* ve *IMPORT* kısmı. `ntdll.dll` dosyasında sadece export bulunduğu için öncelikle export olayına bir bakalım. Dosya içerisinden export edilen fonksiyonlar, bu dll dosyasını kullanığı taktirde diğer programlar tarafından kullanılabilir demektir. Bu tablonun yapısı *IMAGE_EXPORT_DIRECTORY* ile tanımlı fakat debug sembollerinde ne yazık ki yok. Internette kısa bir araştırmadan sonra yapının şöyle olduğunu görebiliriz:

    typedef struct _IMAGE_EXPORT_DIRECTORY {
        DWORD Characteristics;       #0x0
        DWORD TimeDateStamp;         #0x4
        WORD MajorVersion;           #0x8
        WORD MinorVersion;           #0xA
        DWORD Name;                  #0xC
        DWORD Base;                  #0x10
        DWORD NumberOfFunctions;     #0x14
        DWORD NumberOfNames;         #0x18
        DWORD AddressOfFunctions;    #0x1C
        DWORD AddressOfNames;        #0x20
        DWORD AddressOfNameOrdinals; #0x24
     }

Şimdi Windows XP makinamıza dönelim ve kernel debugging yaparaktan ntdll.dll dosyasına bir bakalım. Öncelikle bu tablonun adresini bulmamız gerekecek.

    kd> dd 0x7c9000D0 + 0x78
    7c900148 | 00003400 00009a5e 00000000 00000000

`0x7c9000D0` adresi bizim PE sihirli numaramızın başladığı yer, buraya bu *_IMAGE_DATA_DIRECTORY* yapısının bulunduğu 78 offsetini ekliyoruz. Peki neden 78 ? Çünkü PE yapısına bakacak olursak 4 byte PE sihirli sayısı, **20** byte PE File Header, **96** byte optional header kısmı toplanınca **120** decimal yani **78** hex yapıyor. Şimdi burada görülen ilk iki adresten ilki `00003400` tablomuzun adresi, `00009a5e` ise uzunluğu. Şimdi bu yapının içerisine bakmaya çalışalım.  

    kd> dd 7c903400
    7c903400 | 00000000 4d00dcd0 00000000 00006790
    7c903410 | 00000001 00000524 00000524 00003428
    7c903420 | 000048b8 00005d48 0005a2c3 0005a22b
    7c903430 | 0005a18d 00002ad0 00002b30 00002b40
    7c903440 | 00002b20 0001f750 0001f7b1 0001c567
    7c903450 | 00021225 000212e6 00051f73 00012c49
    7c903460 | 00021ddf 0001f6f7 00051f68 00051ee3
    7c903470 | 00019e5a 00051ff4 00051fa6 00051f1f

Burası bizim export yapımız, şimdi yapıda verilen offset değerlerine göre bilgileri alabiliriz. Exportları görmek için Name kısmına bakmamız gerek yani *0xC*.

    kd> dd 7c903400 + 0xC
    7c90340c | 00006790 00000001 00000524 00000524

`00006790` adresine bakıyoruz hemen:

    kd> db 0x7c906790
    7c906790  6e 74 64 6c 6c 2e 64 6c-6c 00 43 73 72 41 6c 6c  ntdll.dll.CsrAll
    7c9067a0  6f 63 61 74 65 43 61 70-74 75 72 65 42 75 66 66  ocateCaptureBuff
    7c9067b0  65 72 00 43 73 72 41 6c-6c 6f 63 61 74 65 4d 65  er.CsrAllocateMe
    7c9067c0  73 73 61 67 65 50 6f 69-6e 74 65 72 00 43 73 72  ssagePointer.Csr
    7c9067d0  43 61 70 74 75 72 65 4d-65 73 73 61 67 65 42 75  CaptureMessageBu
    7c9067e0  66 66 65 72 00 43 73 72-43 61 70 74 75 72 65 4d  ffer.CsrCaptureM
    7c9067f0  65 73 73 61 67 65 4d 75-6c 74 69 55 6e 69 63 6f  essageMultiUnico
    7c906800  64 65 53 74 72 69 6e 67-73 49 6e 50 6c 61 63 65  deStringsInPlace

Gördüğünüz gibi export edilen fonksiyonlar burada. Bu işin karmaşık olan yolu, yapıyı görmeniz için böyle gösterdim fakat isterseniz *DIE* ile bu fonksiyonları rahatça görebilirsiniz.

![](/files/exports.png)

### Import Tablosu
Bir diğer kısım olan import ise exportun tam tersi gibi. Yani program tarafından ihtiyaç duyulan ve dışarıdan çağırılan fonksiyonları içeriyor. Örneğin içirisinde string kopyalama olan bir küçük programın import tablosunu inceleyelim. Hatırlarsanız Export yapısı *0x78* offsetinde bulunuyordu, uzunluğunun 8 byte olduğunu da hesaba katarsak decimal olarak 120+8 **=** 128 **=** 0x80. Şimdi bu offsete bakalım.

    0:000> dd 00400080 + 0x80
    00400100 | 00008000 0000054c 00000000 00000000
    00400110 | 00000000 00000000 00000000 00000000
    00400120 | 00000000 00000000 00000000 00000000
    00400130 | 00000000 00000000 00000000 00000000
    00400140 | 0000a000 00000018 00000000 00000000
    00400150 | 00000000 00000000 00008118 000000c8
    00400160 | 00000000 00000000 00000000 00000000
    00400170 | 00000000 00000000 7865742e 00000074

Çalışan program `00400000` adresinde, PE ise `00400080`. İlk değer `00008000` yani adresimiz `00408000`, Import tablosu hakkında bilgi tutan *IMAGE_IMPORT_DESCRIPTOR* yapısı şu şekilde:

    typedef struct _IMAGE_IMPORT_DESCRIPTOR {
        DWORD   OriginalFirstThunk; #0x0
        DWORD   TimeDateStamp;      #0x4
        DWORD   ForwarderChain;     #0x8
        DWORD   Name;             #0xC
        DWORD   FirstThunk;           #0x10
    }

Şimdi burada FirstTrunk kısmına bakalım.

    0:000>  dd 00408000 + 0x10
    00408010 | 00008118 00008088 00000000 00000000

`00008118` offsetindeyimiş. `dps` ile dump edelim:

    0:000> dps 0x0400000 + 00008118
    00408118  76ff2974 ntdll!RtlDeleteCriticalSection
    0040811c  76fcfd00 ntdll!RtlEnterCriticalSection
    00408120  765d7f64 KERNEL32!ExitProcessImplementation
    00408124  765cce24 KERNEL32!GetCommandLineAStub
    00408128  765c36c0 KERNEL32!GetLastErrorStub
    0040812c  765ca647 KERNEL32!GetModuleHandleAStub
    00408130  765c980c KERNEL32!GetProcAddressStub
    00408134  76fd81f3 ntdll!RtlInitializeCriticalSection
    00408138  76fcfd40 ntdll!RtlLeaveCriticalSection
    0040813c  765ccf38 KERNEL32!SetUnhandledExceptionFilterStub
    00408140  765c1940 KERNEL32!TlsGetValueStub
    00408144  765c971f KERNEL32!VirtualProtectStub
    00408148  765c9a6e KERNEL32!VirtualQueryStub
    ---snip---

Adresleri bulmak için `dh` komutu size yardımcı olabilir, örneğin :

    0:000> !dh -f 00400000 
         ---snip--
           0  DLL characteristics
           0 [       0] address [size] of Export Directory
        8000 [     54C] address [size] of Import Directory
           --snip--
        8118 [      C8] address [size] of Import Address Table Directory
           --snip--

Ayrıca yine *DIE* kullanarak da importları basitçe görebilirsiniz.

![](/files/import.png)

---
* [Kaan Aslan - PE](http://www.kaanaslan.com/resource/article/display_article.php?id=93)
* Secrets of Reverse Engineering 97-99
* [MSDN PE](http://msdn.microsoft.com/en-us/library/ms809762.aspx)
* [Randy Kath](http://www.csn.ul.ie/~caolan/publink/winresdump/winresdump/doc/pefile2.html)
* [Section Table](http://win32assembly.programminghorizon.com/pe-tut5.html)
