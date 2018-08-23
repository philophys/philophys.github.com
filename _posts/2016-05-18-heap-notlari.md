---
title: Heap hakkında notlar
---

Merhaba.

Heap, programımızdaki veriler için dinamik olarak hafıza tahsis işlemleri yapabileceğimiz hafıza alanlarıdır. Genelde programda kullanacağımız verinin boyutu bilinmediğinde veya verinin *stack*'e sığmayacak kadar büyük olduğu zamanlarda kullanım ihtiyacı vuku buluyor.

İşletim sistemi, yeni bir işlem başladığı sırada bu işlemin adres alanı içerisinde "*Process Default Heap*" adı verilen bir heap oluşturuyor. Ne kadar boyutta olacağı ise çalıştırılabilir dosyanın içerisinde(genelde *1 MB*) belirtiliyor. (Önceki yazılarda değinmiştik sanırım..) İşlem sonlandırıldığı sırada ise bu heap yok ediliyor. 

Öntanımlı gelen heap dışında kendi özel heap alanlarımızı oluşturmamız mümkün. Ardından bu heap alanını kullanabilir, büyütebilir ve tabiki yok edebiliriz de. Ayrıca bu kendi oluşturduğumuz heap birden fazla da olabilir.. Fakat bizim oluşturduğumuz heap sadece kendi adres alanımızda geçerlidir. Yani diğer işlemler(process) bizim oluşturduğumuz heap'e ulaşamaz, keza bizim öntanımlı heap'e de ulaşamazlar..

Heap işlemleri sıralı olarak yapılıyor. Yani misal aynı anda iki yerde heap'ten hafıza tahsisi normalde mümkün değil. Fonksiyonlar içerisinde eşzamanlılığı sağlamak için kritik alanlar(*critical section*) kullanılıyor bu sayede oluşabilecek hataların da önüne geçiliyor. Kritik alan içerisinde bulunan kod yalnızca tek bir thread tarafından çalıştırılabilir bu sayede diğer threadler bu bölümdeki kodu çalıştırmadan önce diğer thread kritik alandan çıkana kadar bekler. Fakat dilersek `HEAP_NO_SERIALIZE` sabitini kullanarak bu özelliği devre dışı bırakabiliriz. Bu, performansta biraz artış sağlasa da heap'de bulunan verinin bozulmasına sebep verebilir. Heap'e sadece tek thread ulaşıp işlem yapıyorsa kullanmak mantıklı gibi.

İşin biraz işletim sistemi tarafına bakılırsa işlemin sahip olduğu heap'ler **PEB**'in **ProcessHeaps** alanından bulunabilir. 

    +0x08c MaximumNumberOfHeaps : 0x10
    +0x090 ProcessHeaps     : 0x77949660  -> 0x006b0000 Void
    +0x094 GdiSharedHandleTable : (null) 
    +0x098 ProcessStarterHelper : (null) 
    +0x09c GdiDCAttributeList : 0

Bu alanda var olan heap'ler için bir gösterici dizisi var diye düşünebiliriz ve hepsi `_HEAP` yapısı ile gösteriliyor.

    0:000> dd 0x77949660  
    77949660  006b0000 00000000 00000000 00000000
    77949670  00000000 00000000 00000000 00000000
    
    0:000> dt _HEAP 006b0000
    ntdll!_HEAP
       +0x000 Segment          : _HEAP_SEGMENT
       +0x000 Entry            : _HEAP_ENTRY
       +0x008 SegmentSignature : 0xffeeffee
       +0x00c SegmentFlags     : 2
       +0x010 SegmentListEntry : _LIST_ENTRY [ 0x6b00a4 - 0x6b00a4 ]
       +0x018 Heap             : 0x006b0000 _HEAP
       +0x01c BaseAddress      : 0x006b0000 Void
       +0x020 NumberOfPages    : 0xff
       +0x024 FirstEntry       : 0x006b0498 _HEAP_ENTRY
       +0x028 LastValidEntry   : 0x007af000 _HEAP_ENTRY
       +0x02c NumberOfUnCommittedPages : 0xf2
       +0x030 NumberOfUnCommittedRanges : 1
       +0x034 SegmentAllocatorBackTraceIndex : 0
       +0x036 Reserved         : 0
       +0x038 UCRSegmentList   : _LIST_ENTRY [ 0x6bcff0 - 0x6bcff0 ]
       +0x040 Flags            : 0x40000062
       +0x044 ForceFlags       : 0x40000060
       +0x048 CompatibilityFlags : 0x20000000
       +0x04c EncodeFlagMask   : 0x100000
       +0x050 Encoding         : _HEAP_ENTRY
       +0x058 Interceptor      : 0
       +0x05c VirtualMemoryThreshold : 0xfe00
       +0x060 Signature        : 0xeeffeeff
       +0x064 SegmentReserve   : 0x100000
       +0x068 SegmentCommit    : 0x2000
       +0x06c DeCommitFreeBlockThreshold : 0x200
       +0x070 DeCommitTotalFreeThreshold : 0x2000
       +0x074 TotalFreeSize    : 0x149
       +0x078 MaximumAllocationSize : 0x7ffdefff
       +0x07c ProcessHeapsListIndex : 1
       +0x07e HeaderValidateLength : 0x248
       +0x080 HeaderValidateCopy : (null) 
       +0x084 NextAvailableTagIndex : 0
       +0x086 MaximumTagIndex  : 0
       +0x088 TagEntries       : (null) 
       +0x08c UCRList          : _LIST_ENTRY [ 0x6bcfe8 - 0x6bcfe8 ]
       +0x094 AlignRound       : 0x17
       +0x098 AlignMask        : 0xfffffff8
       +0x09c VirtualAllocdBlocks : _LIST_ENTRY [ 0x6b009c - 0x6b009c ]
       +0x0a4 SegmentList      : _LIST_ENTRY [ 0x6b0010 - 0x6b0010 ]
       +0x0ac AllocatorBackTraceIndex : 0
       +0x0b0 NonDedicatedListLength : 0
       +0x0b4 BlocksIndex      : 0x006b0260 Void
       +0x0b8 UCRIndex         : (null) 
       +0x0bc PseudoTagEntries : (null) 
       +0x0c0 FreeLists        : _LIST_ENTRY [ 0x6b7bd8 - 0x6bc780 ]
       +0x0c8 LockVariable     : 0x006b0248 _HEAP_LOCK
       +0x0cc CommitRoutine    : 0xa0002354     long  +ffffffffa0002354
       +0x0d0 FrontEndHeap     : (null) 
       +0x0d4 FrontHeapLockCount : 0
       +0x0d6 FrontEndHeapType : 0 ''
       +0x0d7 RequestedFrontEndHeapType : 0 ''
       +0x0d8 FrontEndHeapUsageData : 0x006b04a0  -> 0
       +0x0dc FrontEndHeapMaximumIndex : 0x80
       +0x0de FrontEndHeapStatusBitmap : [257]  ""
       +0x1e0 Counters         : _HEAP_COUNTERS
       +0x23c TuningParameters : _HEAP_TUNING_PARAMETERS

Örnekte yalnızca işlemin öntanımlı heap'i olduğu için tek girdi var. `_HEAP` yapısının elemanları tıpkı diğer sistem yapıları gibi oldukça faydalı gözüküyo, özellikle **FreeLists**, **VirtualAllocdBlocks** alanları gibi.. Tabi bunlar işin saykodelik boyutundaki bakışlardan kaynaklanan dallanmalar. Ne diye işin kaynağına iniyoruz sanki, değil mi?

Mesela aşağıda Windows'daki katmalı hafıza yönetiminin özetinin özetini görebilirsiniz:

![](/files/wingeneralheap.gif)

İşin Windows'un Heap yöneticisi (ve diğer yöneticiler) kısmına bu bölümdeki(Diğer) yazılarda mümkün mertebe girmemeye çalışıcam çünkü burayı kısa notlar için falan açtım.. Belki heap yöneticisi diye başka bir yazıda belki..

## Heap yönetiminde kullanılan fonksiyonlar

### GetProcessHeap
İşlemin öntanımlı heap'ine tutamak döner. Başarısız olma durumunda ise **NULL**. Bu tutamak diğer heap fonksiyonlarında kullanılır genelde. Prototipi şöyle:

    HANDLE WINAPI GetProcessHeap(void);

### GetProcessHeaps
Hatırlarsanız bir process birden fazla heap oluşturabiliyordu. Bu fonksiyon ile process içindeki toplam heap sayısını ve bu heap'lere tutamak elde edebilirsiniz. Prototipi şöyle:

    DWORD WINAPI GetProcessHeaps(
      _In_  DWORD   NumberOfHeaps,
      _Out_ PHANDLE ProcessHeaps
    );

**NumberOfHeaps**, __**ProcessHeaps**__ tarafından belirlenen alana en fazla kaç tane tutamak yerleştirilsin onu gösteriyor.

**ProcessHeaps**, process içindeki heap'lerin tutamağını içeren bir dizinin koyulacağı yer.

Fonksiyon toplam heap sayısını geri dönüyor eğer başarılı olursa, aksi durumda ise sıfır dönüyor.

### HeapCreate
Adından anlaşılacağı gibi yeni bir heap oluşturmak için kullanılıyor. Prototipi şöyle:

    HANDLE WINAPI HeapCreate(
      _In_ DWORD  flOptions,
      _In_ SIZE_T dwInitialSize,
      _In_ SIZE_T dwMaximumSize
    );

**flOptions**, heap üzerinde işlemlerin nasıl gerçekleşeceğini belirtiyor. `HEAP_CREATE_ENABLE_EXECUTE`, `HEAP_GENERATE_EXCEPTIONS`, `HEAP_NO_SERIALIZE` sabitleri birlikte veya ayrık kullanılabilir.

**HEAP_CREATE_ENABLE_EXECUTE**: Bu heap'den ayrılan bloklarda kod çalıştırmaya izin verilir.
**HEAP_GENERATE_EXCEPTIONS**: Heap'de alan tahsisi esnasında bir hata meydana gelmesi durumunda sistem bir istisna oluşturur.
**HEAP_NO_SERIALIZE**: Bu sabit bu heap'e yapılan diğer fonksiyon çağırılarını da etkiler. Kullanıldığı zaman heap'e olan sıralı erişim devreden çıkar. Yani fonksiyonlar heap'de işlem yapmak için birbirini beklemezler ve bu veri bozulmalarına sebep olabilir, ne yaptığınızı bilmiyorsanız kullanmamalı. Aşağıdaki durumlarda ise kullanılmasında sakınca yok deniliyor.

* İşleminiz sadece bir tane thread kullanıyorken
* İşleminiz birden fazla thread kullanıyor fakat sadece tek thread heap'e erişiyorsa
* İşleminiz birden fazla thread kullanıyor ve bunlar heap'e erişiyor, fakat sıralı erişimi diğer eşzamanlama(senkronizasyon) nesneleri ile hallediyorsanız

**dwInitialSize**, heap oluşturulduktan sonra "*commit*" edilecek miktarı belirtir. Buradaki değer gerekli olursa sistemin sayfa boyutuna tekrar hizalanır. Ehehe, evet çoğu yerde böyle hizalamalar yapılıyor yani windows bazen tam sizin istediğinizi yapmıyor. Hah, bir de *dwMaximumSize*'den küçük olması lazım.

**dwMaximumSize**, Heap'in en fazla ne kadar büyüyebileceğini gösteriyor (bayt cinsinden). Eğer **0** verilirse büyüyebilen bilen bir heap oluyor. Bu da fiziksel alan dolana kadar tahsis yapabilmek demek. Bu durumda büyükçe alanlar tahsis edebilirsiniz( fonksiyon **VirtualAlloc**'u çağırıyor o zaman). Fakat, eğer **0**'dan farkı bir değer verirsek yapabileceğimiz tahsis boyutu da değişiyor. *32* bit sistemde en fazla **512 KB**, *64* bit sistemde ise **1024 KB** kullanabilirsiniz. Daha fazlası heap'e sığsa bile hata verir. 

Fonksiyon başarılı olursa yeni oluşturulan heap'e tutamak(handle) dönüyor, aksi durumda ise **NULL**.

### HeapAlloc
Var olan bir heap'den hafıza bloğu tahsis etmek için kullanılır. Prototipi şöyle:

    LPVOID WINAPI HeapAlloc(
      _In_ HANDLE hHeap,
      _In_ DWORD  dwFlags,
      _In_ SIZE_T dwBytes
    );

**hHeap**, hangi heap'den tahsis yapılacağını belirtiyor. Var olan bir heap'e tutamak vermemiz gerek. Bu tutamak `HeapCreate` veya `GetProcessHeap` ile elde edilebilir.

**dwFlags**, tahsis ayarları gibi bişey. `HEAP_GENERATE_EXCEPTIONS`, `HEAP_NO_SERIALIZE`, `HEAP_ZERO_MEMORY` ayrık veya birlikte kullanılabilir. Buradakileden birini kullanmak `HeapCreate` kullanırken **flOptions**'e verilen değerinin önüne geçer bunu unutmamak lazım.

**HEAP_GENERATE_EXCEPTIONS**: *HeapCreate* fonksiyonundaki açıklamaya bakınız.
**HEAP_NO_SERIALIZE**: *HeapCreate* fonksiyonundaki açıklamaya bakınız.
**HEAP_ZERO_MEMORY**: Tahsis edilen hafıza bloğunun sıfırlan doldurur.

**dwBytes**, ne kadarlık bi alan tahsis edilecek onu belirtiyor.

Bu arada, değişik boyutlarda hafıza blokları tahsis etmek bir süre sonra heap üzerinde parçalanma(*fragmantation*) oluşturabilir. Ama Windows XP'den sonraki sistemler heap tahsisi sırasında low-fragmentation kullandığı için sorun yok. XP kullanıyorsanız heap'i low-fragmantation'a çevirmelisiniz<sup>[1](https://msdn.microsoft.com/en-us/library/windows/desktop/aa366750(v=vs.85).aspx)</sup>.

Fonksiyon başarılı olursa tahsis ettiği alana gösterici dönüyor, aksi durumda ise **NULL** döner. (Tabi eğer `HEAP_GENERATE_EXCEPTIONS` kullanılmadıysa).

### HeapReAlloc
Basitçe daha önce heap'de tahsis edilmiş bir alanın boyutunu büyütmek/küçültmek için kullanılıyor diyebiliriz. Prototipi şöyle:

    LPVOID WINAPI HeapReAlloc(
      _In_ HANDLE hHeap,
      _In_ DWORD  dwFlags,
      _In_ LPVOID lpMem,
      _In_ SIZE_T dwBytes
    );

**hHeap**, kullanılacak olan heap'e tutamak.

**dwFlags**, önceki fonksiyonda belirttiklerim dışında ek olarak `HEAP_REALLOC_IN_PLACE_ONLY` kullanabiliyoruz. Bu sabitin kullanımı bloğun olduğu yerde büyütülmesine sebep olur. Yani önceden ayırdığımız blok yeni bir yere taşınmaz. Eğer olduğu yerde büyüyemezse fonksiyon hata verir, blok büyütülmemiş kalır.

**lpMem**, üzerinde işlem yapılacak hafıza bloğunun adresi. Genelde `HeapAlloc`'dan elde ettiğiniz değer yani

**dwBytes**, heap'deki tahsis edilmiş alanın yeni boyutu. **hHeap** ile belirtilen heap, büyüyebilen bir heap değilse buradaki en büyük değer `0x7FFF8-1` olabilir.

Başarılı olursa yeniden tahsis edilen hafıza bloğunu döner. Aksi durumda ise **NULL**.

### HeapFree
`HeapAlloc` veya `HeapReAlloc` ile heap'den tahsis edilmiş bir hafıza bloğunu serbest bırakır. Prototipi şöyle:

    BOOL WINAPI HeapFree(
      _In_ HANDLE hHeap,
      _In_ DWORD  dwFlags,
      _In_ LPVOID lpMem
    );

**hHeap**, kullanacağımız heap'e tutamak.

**dwFlags**, burada yalnızca `HEAP_NO_SERIALIZE` kullanılabilir. Açıklaması yukarıda.

**lpMem**, serbest bırakılacak hafıza bloğunun adresi. `HeapAlloc` veya `HeapReAlloc` tarafından bize verilen adres yani.

Fonksiyon başarılı olursa sıfır dışında bir değer dönüyor. Başarısız olursa sıfır dönüyor.

### HeapDestroy 
Önceden oluşturulmuş bir heap'i yok eder, ontolojik olarak siler sistemden ehehe. Bunu yaparken heap'in sahip olduğu her şeyi de yok ediyor tabi. Prototipi şöyle:

    BOOL WINAPI HeapDestroy(
      _In_ HANDLE hHeap
    );

**hHeap**, tahmin edebileceğiniz gibi yok edilecek olan heap'e tutamak. Genelde `HeapCreate` fonksiyonundan dönen tutamağı kullanıyoruz burada. *Microsoft*'un dediğine göre burada işlemin öntanımlı heap'inin tutamağını kullanmamalıyız.

Bu fonksiyonu çalıştırmadan önce HeapFree ile heap içerisindeki blokları serbest bırakmamız gerekmiyor, direkt çağırabiliriz.

Başarılı olursa sıfırdan farklı, başarısız olursa sıfır dönüyor.

### HeapSize
Heap üzerinde tahsis edilmiş bir hafıza bloğunun boyutunu verir. Prototipi şöyle:

    SIZE_T WINAPI HeapSize(
      _In_ HANDLE  hHeap,
      _In_ DWORD   dwFlags,
      _In_ LPCVOID lpMem
    );

**hHeap** ve **dwFlags**'ı biliyorsunuz (buradaki için `HeapFree` ile aynı, oraya bakınız).

**lpMem**, hatta bunu da biliyorsunuz ehehe.  `HeapAlloc` veya `HeapReAlloc`'dan dönen hafıza bloğunun adresi kullanılıyor burada.

Ah, bu arada `HeapSize` ve `HeapCreate` fonksiyonunda **dwFlags** için **0** kullanabilirsiniz.

Fonksiyon başarılı olursa belirtilen bloğun boyutunu, başarısız olursa **-1** döner.

Buradakiler dışında [HeapValidate](https://msdn.microsoft.com/en-us/library/windows/desktop/aa366708(v=vs.85).aspx), [HeapWalk](https://msdn.microsoft.com/en-us/library/windows/desktop/aa366710(v=vs.85).aspx), [HeapLock](https://msdn.microsoft.com/en-us/library/windows/desktop/aa366702(v=vs.85).aspx) gibi fonksiyonlar da var. Ayrıca ToolHelp fonksiyonları altında da heap ile ilgili fonksiyonlar var, bakılabilir..

Sevgiler
