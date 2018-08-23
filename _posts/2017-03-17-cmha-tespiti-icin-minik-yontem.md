---
title: ÇMHA Tespiti İçin Minik Bir Yöntem
---

Selamlar,

Öncelikle ÇMHA nedir? Çekirdek Modu Hata Ayıklayıcısı. Yani bu durumda aşağıdaki yöntem de çekirdek modu hata ayıklayıcısının bağlı olup olmadığını kontrol etmek için kullanılabilecek bir yöntem oluyor. Peki nasıl?

Windows işletim sisteminde çekirdek ile kullanıcı modu arasında paylaşılan birtakım alanlar bulunmaktadır. Bunlardan biri de _Çekirdek-Kullanıcı Paylaşılan Verisi_(Kernel-User Shared Data) olarak adlandırılıyor. Burası hem kullanıcı modundan hem de çekirdek modundan (farklı adreslerle) erişilebilir durumda olan bir yer.

Buradaki veriler `_KUSER_SHARED_DATA` veri yapısına göre saklanırlar. Yapının içeriği ise biraz hohollu ama içinde oldukça faydalı şeyler var (yapıyı yazının en altında bulabilirsiniz). Windows sistemlerde bu paylaşılan alana kullanıcı modundan `0x7FFE0000` adresi ile **yalnızca okunabilecek** bir izinle erişilebiliyor. Çekirdek modundan erişmek için ise `0xFFDF0000`(32 bit için) veya `0xFFFFF780'00000000` (64bit için) adresi kullanılabilir, pek tabi okuma ve yazma izniyle. Daha da güzeli, bunun yanlış bilmiyorsam ta Windows XP'den önceki birkaç sürüme kadar bile geçerli olması. Mesela güncel bir sisteme bakalım:

```
kd> vertarget
Windows 10 Kernel Version 14393 MP (2 procs) Free x64
kd> !kuser
_KUSER_SHARED_DATA at fffff78000000000
```

Bir diğer çıktı ise biraz daha eski bir sistemden:

```
kd> vertarget
Windows XP Kernel Version 2600 (Service Pack 3) MP (2 procs) x86
kd> !kuser
_KUSER_SHARED_DATA at ffdf0000
```

32/64 bit farkından dolayı ÇM adresleri farklı çıktı tabi ama aynı işlemci yapısındaki sistemlerde adres de aynı olacaktır. Kullanıcı modu tarafından ise adres her zaman aynıdır, yani : `0x7FFE0000`.

Genelde ÇMHA tespit etmek için _NtQuerySystemInformation_ fonksiyonu _SystemKernelDebuggerInformation_ tür numarası ile çağırılır. Bunun sonunda ise fonksiyon size `_SYSTEM_KERNEL_DEBUGGER_INFORMATION ` yapısında bir veri döndürecektir. Bu sayede de ÇMHA bağlı olup olmadığını öğrenebileceksiniz. Fakat bu yöntem ilgili fonksiyonun dışa aktarılmaması, kolayca kancalanabilmesi gibi yitirimleri olmasından dolayı pek tercih olmuyor. E bir de tabi daha kısası varken, uzun olanı kullanıp daha fazla yer tüketmek de bazı insanlar için(?) pek uygun bir çözüm değil.

Tabi dilerseniz bu fonksiyonun sistem çağrı numarasını bulup, her işletim sistemi sürümüne göre ayrı bir direkt çağırım kodu da yazabilirsiniz. O zaman kancalanması azcık zorlaşacaktır fakat bu da fazladan uğraş gerektirecek her sürümde sistem çağrı numaraları değişebileceğinden dolayı. Bunun yerine konu başında bahsettiğimiz yapıda bulunan `KdDebuggerEnabled` alanına bakmak daha hoş ve işlevsel gözüküyor. Bunun için de yalnızca 1 baytlık yerde bir karşılaştırma yapmanız yeterli. Adres de sabit olduğundan dolayı kullanıcı modundan `0x7FFE0000 + 2d4`, yani `7FFE02D4` adresine bakmamız gerekiyor (tabi bu uzaklık değeri değişebilir zamanla). Peki ne için bakacağız derseniz ÇMHA bağlı olduğunda çekirdek bu alandaki veriyi (benim denemelerimde) `3`'e ayarlıyor. Aksi durumda ise `0` değerini alıyor. 

Sonradan not: içim rahat etmedi ve tekrar inceledim. Evet, hata ayıklayıcı bağlıysa bu alan 3 oluyor. Fakat bu 3, aslında 2 ile 1'in mantıksal veya'sından oluşan bir üç, bu ayrıntı bence önemli. Şunu diyebilirim sanırım, hata ayıklayıcı ilk bağlandığı anda buradaki değer 1 oluyor. Devamında "lider paket" denilen bir hata ayıklama paketi alındığı anda ise, değer 2 ile mantıksal veya işlemine girip 3 yapılıyor. Yani direkt 3 olma durumu yok anlayabildiğim kadarıyla.

Örneğin:

```assembly
cmp byte ptr ds:[7ffe02d4h], 3
jz cmhaVar
;buraya geldiyse yok
---
mov al, byte ptr ds:[7ffe02d4h]
cmp al, 3
setz al
mov sonuc, al ; ÇMHA varsa sonuc = 1, yoksa 0
```

ve benzeri gibi basit kod parçacıkları ile ÇMHA bağlı mı değil mi anlayabilirsiniz... Elbette illa assembly ile olacak diye bir şey yok hehe. Bunun gibi bir çok ince takla var aslında çeşitli işlemleri yapabilmek için. Genelde böyle kara kara bakan adamlar kullanıyor ama olsun, geçenlerde benim de işime yaradı. Ya, esasen tam olarak bu değildi, paylaşılan alandaki ayrılmış alanları kullanmak benim işime yaramıştı ama bu arkadaşı da girdilerin arasında görünce buraya not olsun dedim...

Bu arada sanırım Windows 8'den itibaren (imaj olmadığı için test edemedim, imajı olan bakabilir mi?) _ntdll_ içerisinde bulunan bir fonksiyon da bu işlevi görüyor olması gerek. O fonksiyon ise: **RtlIsAnyDebuggerPresent**. Eğer fonksiyona bakarsanız aşağı yukarı şöyle bir şey göreceksiniz (yukarının C hali gibi gibi):

```c
BOOLEAN RtlIsAnyDebuggerPresent()
{
  BOOLEAN Ayiks; 

  Ayiks = NtCurrentPeb()->BeingDebugged;         // Kullanıcı modu için
  if ( !Ayiks )
    Ayiks = ( * (char *)0x7FFE02D4 & 3 ) == 3;  // Çekirdek modu için
  
  return Ayiks;
```

İsminden anlaşılabileceği gibi fonksiyon hem kullanıcı hem de çekirdek modu hata ayıklayıcısı var mı yok mu diye test ediyor. Kullanıcı modu için dikkat ederseniz _PEB_'in _BeingDebugged_ alanı kontrol edilmiş, malumunuz en sık kullanılan yöntemlerden biri... Çekirdek için ise bahsettiğim alan(_KdDebuggerEnabled_) kullanılıyor. Bu alanın kullanıldığı yerlere baktığımızda çeşitli işletim sistemi parçalarının çekirdek hata ayıklayıcı olup olmadığını kontrol etmek için kullandığını da görebiliyoruz... 

Paylaşılan yapının tamamı aşağıda. Dikkat ederseniz burada işinize yarayacak başka veriler de bulabilirsiniz. Mesela direkt çekirdek sürümünü, sistem dizinini, derleme numarasını, işlemci özelliklerini, saati, sistem çağrılarında kullanılacak çeşidi bunlar arasında sayabiliriz. Belki de ayrılmış bölümleri çekirdekten kullanıcıya mesaj göndermek için kullanabilirsiniz bile...

```
ntdll!_KUSER_SHARED_DATA
   +0x000 TickCountLowDeprecated : Uint4B
   +0x004 TickCountMultiplier : Uint4B
   +0x008 InterruptTime    : _KSYSTEM_TIME  -- 
   +0x014 SystemTime       : _KSYSTEM_TIME  -- 
   +0x020 TimeZoneBias     : _KSYSTEM_TIME
   +0x02c ImageNumberLow   : Uint2B
   +0x02e ImageNumberHigh  : Uint2B
   +0x030 NtSystemRoot     : [260] Wchar    --
   +0x238 MaxStackTraceDepth : Uint4B
   +0x23c CryptoExponent   : Uint4B
   +0x240 TimeZoneId       : Uint4B
   +0x244 LargePageMinimum : Uint4B
   +0x248 AitSamplingValue : Uint4B
   +0x24c AppCompatFlag    : Uint4B
   +0x250 RNGSeedVersion   : Uint8B
   +0x258 GlobalValidationRunlevel : Uint4B
   +0x25c TimeZoneBiasStamp : Int4B
   +0x260 NtBuildNumber    : Uint4B  --
   +0x264 NtProductType    : _NT_PRODUCT_TYPE
   +0x268 ProductTypeIsValid : UChar
   +0x269 Reserved0        : [1] UChar --
   +0x26a NativeProcessorArchitecture : Uint2B
   +0x26c NtMajorVersion   : Uint4B  --
   +0x270 NtMinorVersion   : Uint4B  --
   +0x274 ProcessorFeatures : [64] UChar  --
   +0x2b4 Reserved1        : Uint4B  --
   +0x2b8 Reserved3        : Uint4B  --
   +0x2bc TimeSlip         : Uint4B
   +0x2c0 AlternativeArchitecture : _ALTERNATIVE_ARCHITECTURE_TYPE
   +0x2c4 BootId           : Uint4B
   +0x2c8 SystemExpirationDate : _LARGE_INTEGER
   +0x2d0 SuiteMask        : Uint4B
   +0x2d4 KdDebuggerEnabled : UChar  --
   +0x2d5 MitigationPolicies : UChar
   +0x2d5 NXSupportPolicy  : Pos 0, 2 Bits  --
   +0x2d5 SEHValidationPolicy : Pos 2, 2 Bits
   +0x2d5 CurDirDevicesSkippedForDlls : Pos 4, 2 Bits
   +0x2d5 Reserved         : Pos 6, 2 Bits
   +0x2d6 Reserved6        : [2] UChar
   +0x2d8 ActiveConsoleId  : Uint4B  --
   +0x2dc DismountCount    : Uint4B
   +0x2e0 ComPlusPackage   : Uint4B
   +0x2e4 LastSystemRITEventTickCount : Uint4B
   +0x2e8 NumberOfPhysicalPages : Uint4B
   +0x2ec SafeBootMode     : UChar  --
   +0x2ed VirtualizationFlags : UChar
   +0x2ee Reserved12       : [2] UChar  --
   +0x2f0 SharedDataFlags  : Uint4B
   +0x2f0 DbgErrorPortPresent : Pos 0, 1 Bit
   +0x2f0 DbgElevationEnabled : Pos 1, 1 Bit
   +0x2f0 DbgVirtEnabled   : Pos 2, 1 Bit
   +0x2f0 DbgInstallerDetectEnabled : Pos 3, 1 Bit
   +0x2f0 DbgLkgEnabled    : Pos 4, 1 Bit
   +0x2f0 DbgDynProcessorEnabled : Pos 5, 1 Bit
   +0x2f0 DbgConsoleBrokerEnabled : Pos 6, 1 Bit
   +0x2f0 DbgSecureBootEnabled : Pos 7, 1 Bit
   +0x2f0 DbgMultiSessionSku : Pos 8, 1 Bit
   +0x2f0 DbgMultiUsersInSessionSku : Pos 9, 1 Bit
   +0x2f0 SpareBits        : Pos 10, 22 Bits
   +0x2f4 DataFlagsPad     : [1] Uint4B
   +0x2f8 TestRetInstruction : Uint8B
   +0x300 QpcFrequency     : Int8B
   +0x308 SystemCall       : Uint4B  --
   +0x30c SystemCallPad0   : Uint4B  --
   +0x310 SystemCallPad    : [2] Uint8B  --
   +0x320 TickCount        : _KSYSTEM_TIME  --
   +0x320 TickCountQuad    : Uint8B
   +0x320 ReservedTickCountOverlay : [3] Uint4B
   +0x32c TickCountPad     : [1] Uint4B
   +0x330 Cookie           : Uint4B  --
   +0x334 CookiePad        : [1] Uint4B  --
   +0x338 ConsoleSessionForegroundProcessId : Int8B
   +0x340 TimeUpdateLock   : Uint8B
   +0x348 BaselineSystemTimeQpc : Uint8B
   +0x350 BaselineInterruptTimeQpc : Uint8B
   +0x358 QpcSystemTimeIncrement : Uint8B
   +0x360 QpcInterruptTimeIncrement : Uint8B
   +0x368 QpcSystemTimeIncrementShift : UChar
   +0x369 QpcInterruptTimeIncrementShift : UChar
   +0x36a UnparkedProcessorCount : Uint2B
   +0x36c EnclaveFeatureMask : [4] Uint4B
   +0x37c Reserved8        : Uint4B  --
   +0x380 UserModeGlobalLogger : [16] Uint2B
   +0x3a0 ImageFileExecutionOptions : Uint4B --
   +0x3a4 LangGenerationCount : Uint4B
   +0x3a8 Reserved4        : Uint8B  --
   +0x3b0 InterruptTimeBias : Uint8B
   +0x3b8 QpcBias          : Uint8B
   +0x3c0 ActiveProcessorCount : Uint4B
   +0x3c4 ActiveGroupCount : UChar
   +0x3c5 Reserved9        : UChar  --
   +0x3c6 QpcData          : Uint2B
   +0x3c6 QpcBypassEnabled : UChar
   +0x3c7 QpcShift         : UChar
   +0x3c8 TimeZoneBiasEffectiveStart : _LARGE_INTEGER
   +0x3d0 TimeZoneBiasEffectiveEnd : _LARGE_INTEGER
   +0x3d8 XState           : _XSTATE_CONFIGURATION
```
