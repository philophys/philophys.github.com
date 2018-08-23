---
title: API Çağrıları, System Call Dispatcher ve Dahası
---

Merhabalar, bu gidişatı başından iyi gözükmeyen yazıda sizlere her gün kullandığınız Windows işletim sisteminin siz onu kullanırken arka tarafta gerçekleştirdiği belki de milyonlarca API çağrısının basitçe nasıl gerçekleştiğini göstermeye çalışıcam. İnanın temelde çok basit bir mantık üzerine kurulmuş fakat debug ederken girip çıktığınız dallanmalar işi epey uzatmıyor değil, ama yine de inceleyip debug ederken ben çok zevk aldım, aynısını yaşayacağınızı da umuyorum. Neyse!

Öncelikle şunu belirtmem gerek, yazı bir yerden sonra kontrolden çıkabilir diye düşünüyorum çünkü üzerinde inceleme yaptığımız arkadaş Windows gibi devasa bir şey olunca bazen iş çığırından çıkabiliyor. Yani, abesle iştigal edersek affola.

## Kullanıcı Tarafında API'nin Çağırılması
Biliyorsunuz ki bu çağrılar böyle rastgele kafasına estiği zaman olmuyor. Yani bir tetikleyici olması lazım, e tabii bu da biz oluyoruz. Neyse, şimdi basitçe ResHacker isimli programda bulunan **CreateFileA**'nin nerelerden geçeceğini görelim. Öncelikle bu fonksiyon programda kullanılacağı için, programın Import tablosunda da yer alır, bu sayede program tarafından rahatlıkla kullanılabilir. Örneğin ResHacker programındaki çağırının yapıldığı satır şu şekilde:

	00404E57   . E8 78C3FFFF    CALL <JMP.&kernel32.CreateFileA>         ; \CreateFileA

Bu çağrıyı takip ettiğimizde ise karşımıza bir jump çıkıyor. İşte bu jump *kernel32* içerisinde bulunan **CreateFileA** fonksiyonuna giden adrestir.

	004011D4   $-FF25 28F24A00  JMP DWORD PTR DS:[<&kernel32.CreateFileA>;  kernel32.CreateFileA

Buraya dallanmayı gerçekleştirdikten sonra şu şekilde bir yere geliyoruz. Bu demektir ki artık `kernel32.dll` içerisindeyiz.

	0:000> u kernel32!CreateFileA
	kernel32!CreateFileA:
		7c801a28 8bff            mov     edi,edi
		7c801a2a 55              push    ebp
		7c801a2b 8bec            mov     ebp,esp
		7c801a2d ff7508          push    dword ptr [ebp+8]
		7c801a30 e8dfc60000      call    kernel32!Basep8BitStringToStaticUnicodeString (7c80e114)
		7c801a35 85c0            test    eax,eax
		7c801a37 741e            je      kernel32!CreateFileA+0x11 (7c801a57)
		7c801a39 ff7520          push    dword ptr [ebp+20h]
		...
		...

Kodu debuggerdan takip ederseniz bir süre sonra bu kod sizi `ntdll` içerisindeki **NtCreateFile** fonksiyonuna götürecektir. (ZwCreateFile da olabilir, **user-mode** tarafında bu iki fonksiyon birbirinin aynısıdır.) Bu kısmı da disassemble ederseniz şöyle bir şey göreceksiniz ki biz asıl olarak burdan sonrasına bakacağız.

	0:000> u ntdll!NtCreateFile
	ntdll!NtCreateFile:
		7c90d0ae b825000000      mov     eax,25h  ;CreateFile için çağrı numarası
		7c90d0b3 ba0003fe7f      mov     edx,offset SharedUserData!SystemCallStub (7ffe0300)
		7c90d0b8 ff12            call    dword ptr [edx]
		7c90d0ba c22c00          ret     2Ch
		7c90d0bd 90              nop

Burda gördüğünüz üzre `EAX` yazmacına **CreateFile**'nın çağrı numarası olan 25 saklanıyor, ardından `7ffe0300` adresinin gösterdiği kısım çağırılıyor. Peki burada ne var ? 

	0:000> u poi(SharedUserData!SystemCallStub)
	ntdll!KiFastSystemCall:
		7c90e510 8bd4            mov     edx,esp
		7c90e512 0f34            sysenter

`ntdll!KiFastSystemCall`'ı gösteriyormuş. Şimdi işin rengi gördüğünüzü gibi `sysenter` renginde oldu. Ayrıca dikkat edin, `ESP` de `EDX` yazmacına saklanıyor. Bu sayede parametreler de sysenter çalıştırıldıktan sonra kullanılabilecek. Olayı `sysenter` devraldıktan sonra `KiFastCallEntry` çağırılarak gerekli olan fonksiyon kernel seviyesinde başarı ile çağrılacak diye umuyoruz. Burada `sysenter` çalıştırıldığında basitçe şu sırada ve şu işlemler gerçekleşir;

* *IA32_SYSENTER_CS*'da bulunan segment selektörü **CS** yazmacına yüklenir.
* *IA32_SYSENTER_EIP*'da bulunan **EIP** değer, **EIP** yazmacına yüklenir.
* *IA32_SYSENTER_CS* değerine 8 eklenerek **SS** yazmacına yüklenir.
* *IA32_SYSENTER_ESP*'de bulunan stack pointer **ESP** yazmacına yüklenir.
* Ayrıcalık seviyesi 0 olarak değiştirilir.
* **EFLAGS** yazmacındaki **VM flag**'ı, set edilmiş ise temizlenir.
* Çağrı çalıştırılır.

Şimdii, `sysenter`'dan sonra gerçekleşen işlemleri anlamak için öncelikle sysenter olayını, hatta `sysenter` öncesi ve sonrasını inceleyelim.

**NOT**: Bu MSR isimlerini aynı zamanda SYSENTER öneki ile de görebilirsiniz, örneğin: *SYSENTER_EIP_MSR*, *SYSENTER_CS_MSR* ve *SYSENTER_ESP_MSR*

## sysenter Komutu & 2e Kesmesi

Windows XP'nin ilk sürümlerine kadar sistem çağrıları **IDT** tablosundaki **2e** numaralı kesme ile yapılıyordu. **2e** kesmesi kullanıldığı zamanlarda `ntdll.dll` içerisindeki API, `EAX` yazmacına çağırılan API'nin ordinal değerini, `EDX` yazmacına da stack adresini atarak `int 2e`'yi çalıştırıyor, böylece çağrı gerçekleşiyordu. Fakat bu yöntem öğrenebildiğim kadarıyla performans kaybına neden oluyordu. Çünkü eğer **2e** kesmesi kullanılıyor olursa, işletim sistemi öncelikle IDT tablosundan gereken adresi alıp, bunu çevirip, sonradan oraya gitmesi gerekiyordu; `sysenter` ile bu adres *IA32_SYSENTER_EIP* ile tanımlandı, bu sayede işlemci direk olarak bu adresi okuyup oraya gidebiliyor. (Tabi bu sırada privilege level(ayrıcalık seviyesi) de 3'den 0'a, yani kernel moda yükseltilir. Ardından tekrar `sysexit` fonksiyonu ile 3'e geri düşürülür. Ayrıca unutmadan, kesmeler de iptal ediliyor.) Örneğin *IA32_SYSENTER_EIP* isimli [MSR(Model-specific register)](http://en.wikipedia.org/wiki/Model-specific_register)'nin değerini okumak için `rdmsr` komutunu **176** değeri ile çağırabiliriz;


	kd> rdmsr 176
		msr[176] = 00000000`8053d750


Bu adresi de eğer disassemble edersek en sonunda fonksiyonu çağıran kodlara ulaşmış olacağız.. 2e kullanıldığı zaman da en sonunda buraya ulaşacağız, yazının ilerleyen kısmında unutmazsam göstermeye çalışıcam.

	kd> u 8053d750
	nt!KiFastCallEntry:
		8053d750 b923000000      mov     ecx,23h
		8053d755 6a30            push    30h
		8053d757 0fa1            pop     fs
		8053d759 8ed9            mov     ds,cx
		8053d75b 8ec1            mov     es,cx
		8053d75d 8b0d40f0dfff    mov     ecx,dword ptr ds:[0FFDFF040h]
		8053d763 8b6104          mov     esp,dword ptr [ecx+4]
		8053d766 6a23            push    23h

Gördüğünüz gibi bu adres `KiFastCallEntry`'nin adresini veriyor. Yani sysenter çalıştığında CPU EIP yazmacına bu adresi alarak devam ediyor. Ayrıca sysenter'ın kullandığı iki adet daha, yani toplamda üç adet **MSR** vardır. (Tabii daha bissürü MSR var.) Bunlar;

<style type="text/css">
.tg  {border-collapse:collapse;border-spacing:0;}
.tg td{font-family:Arial, sans-serif;font-size:14px;padding:10px 20px;border-style:solid;border-width:1px;overflow:hidden;word-break:normal;}
.tg th{font-family:Arial, sans-serif;font-size:14px;font-weight:normal;padding:10px 20px;border-style:solid;border-width:1px;overflow:hidden;word-break:normal;}
.tg .tg-e3zv{font-weight:bold}
</style>
<center><table class="tg">
  <tr>
    <th class="tg-e3zv">Model Specific Register</th>
    <th class="tg-e3zv">Index</th>
  </tr>
  <tr>
    <td class="tg-031e">IA32_SYSENTER_CS</td>
    <td class="tg-031e">0x174</td>
  </tr>
  <tr>
    <td class="tg-031e">IA32_SYSENTER_ESP</td>
    <td class="tg-031e">0x175</td>
  </tr>
  <tr>
    <td class="tg-031e">IA32_SYSENTER_EIP</td>
    <td class="tg-031e">0x176</td>
  </tr>
</table></center><br>

`rdmsr` ve `wrmsr` instructionları kullanarak bu değerleri okuyabilir, değiştirebilirsiniz. Bu da zararlı biri için demektir ki bu adresin değiştirilmesi demek, tüm API çağrılarından önce kendi kodumuzu çalıştırabiliriz demek. Neyse. Devam edelim.

Şimdi şunu kendimize sormamız lazım, Windows geriye dönük uyumluluğunu nasıl koruyor ? Yani ya `sysenter` desteği olmayan bir bilgisayara windows kurulursa ne olacak ? Bu sorunun üstesinden gelebilmek için sistem çağrısını yapan kod parçası `KUSER_SHARED_DATA` yapısı içerisinde bulunan `SystemCallStub` isimli bir alanda saklanıyor. Yani kısaca bu da şu demek, Windows işlemciyi kontrol ediyor ve eğer `sysenter` desteği olmayan bir sistemde çalışıyorsa(SEP biti 0) buraya int **2e** için gereken stub, aksi durumda `sysenter` için gereken stub koyuluyor.. 

## KUSER_SHARED_DATA Yapısı ve SystemCallStub
Kısaca incelemek gerekirse öncelikle WinDbg ile `KUSER_SHARED_DATA` yapısını okuyalım.

	0:000> !kuser
		_KUSER_SHARED_DATA at 7ffe0000
		TickCount:    fa00000 * 0001ca2d (0:00:30:32.703)
		TimeZone Id: 1
		ImageNumber Range: [14c .. 14c]
		Crypto Exponent: 0
		SystemRoot: 'C:\WINDOWS'
	0:000> dt _KUSER_SHARED_DATA 7ffe0000
	ntdll!_KUSER_SHARED_DATA
	   +0x000 TickCountLow     : 0x1d850
	   +0x004 TickCountMultiplier : 0xfa00000
	   +0x008 InterruptTime    : _KSYSTEM_TIME
	   +0x014 SystemTime       : _KSYSTEM_TIME
	   +0x020 TimeZoneBias     : _KSYSTEM_TIME
	   +0x02c ImageNumberLow   : 0x14c
	   +0x02e ImageNumberHigh  : 0x14c
	   +0x030 NtSystemRoot     : [260] 0x43
	   +0x238 MaxStackTraceDepth : 0
	   +0x23c CryptoExponent   : 0
	   +0x240 TimeZoneId       : 1
	   +0x244 Reserved2        : [8] 0
	   +0x264 NtProductType    : 1 ( NtProductWinNt )
	   +0x268 ProductTypeIsValid : 0x1 
	   +0x26c NtMajorVersion   : 5
	   +0x270 NtMinorVersion   : 1
	   +0x274 ProcessorFeatures : [64]  ""
	   +0x2b4 Reserved1        : 0x7ffeffff
	   +0x2b8 Reserved3        : 0x80000000
	   +0x2bc TimeSlip         : 0
	   +0x2c0 AlternativeArchitecture : 0 ( StandardDesign )
	   +0x2c8 SystemExpirationDate : _LARGE_INTEGER 0x0
	   +0x2d0 SuiteMask        : 0x110
	   +0x2d4 KdDebuggerEnabled : 0x3 
	   +0x2d5 NXSupportPolicy  : 0x2 
	   +0x2d8 ActiveConsoleId  : 0
	   +0x2dc DismountCount    : 0
	   +0x2e0 ComPlusPackage   : 0xffffffff
	   +0x2e4 LastSystemRITEventTickCount : 0x1ca6c7
	   +0x2e8 NumberOfPhysicalPages : 0x3ff7c
	   +0x2ec SafeBootMode     : 0 
	   +0x2f0 TraceLogging     : 0
	   +0x2f8 TestRetInstruction : 0xc3
	   +0x300 SystemCall       : 0x7c90e510
	   +0x304 SystemCallReturn : 0x7c90e514
	   +0x308 SystemCallPad    : [3] 0
	   +0x320 TickCount        : _KSYSTEM_TIME
	   +0x320 TickCountQuad    : 0
	   +0x330 Cookie           : 0x193c8d2d

Buradaki SystemCall kısmında bulunan adresi disassemble edersek; (diğer alanlar da oldukça önemli, vakit buldukça buralarda gezinmek iyi bir fikir:)

	0:000> u 0x7c90e510
	ntdll!KiFastSystemCall:
		7c90e510 8bd4            mov     edx,esp
		7c90e512 0f34            sysenter
	ntdll!KiFastSystemCallRet:
		7c90e514 c3              ret
		7c90e515 8da42400000000  lea     esp,[esp]
		7c90e51c 8d642400        lea     esp,[esp]
	ntdll!KiIntSystemCall:
		7c90e520 8d542408        lea     edx,[esp+8]
		7c90e524 cd2e            int     2Eh
		7c90e526 c3              ret

Gördüğünüz gibi `sysenter` komutunu çalıştıracak olan fonksiyon burada bulunuyor. Ayrıca `7ffe0000` adresindeki `_KUSER_SHARED_DATA` yapısının +300 ilerisindeki değer de bahsettiğimiz SystemCallStub'a bir pointerdır : `u poi(7ffe0000+300)`

Benim kullandığım XP işletim sisteminde `sysenter` kullanılıyor fakat dilerseniz önceden kullanılan, 2e versiyonunu da görebilirsiniz.

	0:000> u ntdll!KiIntsystemCall
	ntdll!KiIntSystemCall:
		7c90e520 8d542408        lea     edx,[esp+8]
		7c90e524 cd2e            int     2Eh
		7c90e526 c3              ret
		7c90e527 90              nop

IDT tablosunu dump ederek bu kesmede ne bulunduğunu da görebiliriz.

	kd> !idt 2e
	Dumping IDT:

	2e:	8053d691 nt!KiSystemService

	kd> u nt!KiSystemService
	nt!KiSystemService:
		8053d691 6a00            push    0
		8053d693 55              push    ebp
		8053d694 53              push    ebx
		8053d695 56              push    esi
		8053d696 57              push    edi
		8053d697 0fa0            push    fs
		8053d699 bb30000000      mov     ebx,30h
		8053d69e 668ee3          mov     fs,bx


Gördüğünüz üzre bu kesme sayesinde de sysenter'da olduğundan biraz daha farklı olarak önce `KiSystemService` ardından da `KiFastCallEntry`'ye geliyoruz.`KiSystemService`i disassemble ederseniz bir süre sonra kodun `KiFastCallEntry`e dallanacağını görebilirsiniz. Özetle her iki çağırma şeklinde de en son çağrılan  Hatta alıştırma olması için biraz abartıp IDT tablosundan 2e değerini de dump edebiliriz.

 >Buradan sonraki başlığa kadar olan IDT ve GDT kısmını kafanız karışmasın istiyorsanız ve ayrıca yapı hakkındaki ilk 3 yazıyı okumadıysanız lütfen es geçin.


	kd> !descriptor idt 2e
		------------------- Interrupt Gate Descriptor --------------------
		IDT base = 0x8003F400, Index = 0x2e, Descriptor @ 0x8003f570
		8003f570 91 d6 08 00 00 ee 53 80 
		Segment is present, DPL = 3, System segment, 32-bit descriptor
		Target code segment selector = 0x0008 (GDT Index = 1, RPL = 0)
		Target code segment offset = 0x8053d691
		------------------- Code Segment Descriptor --------------------
		GDT base = 0x8003F000, Index = 0x01, Descriptor @ 0x8003f008
		8003f008 ff ff 00 00 00 9b cf 00 
		Segment size is in 4KB pages, 32-bit default operand and data size
		Segment is present, DPL = 0, Not system segment, Code segment
		Segment is not conforming, Segment is readable, Segment is accessed
		Target code segment base address = 0x00000000
		Target code segment size = 0x000fffff

Önceki [yazılarda](/posts/hafiza-yonetimi-sayfalama-ve-segmentasyon-2.html) bahsettiğim Interrupt Gate(Kesme Kapısı) tanımlayıcısı ve Kod segmenti tanımlayıcısı işte gördüğünüz gibi karşımıza çıktı. Elimizdeki verileri de kısaca özet geçmemiz gerekirse;

Burada raw data'nın `91d6 0800 00 e e 5380` olduğunu görmekteyiz. Kesme kapıları hatırlarsanız **64 bit** idi. Ve yapısı basit olarak şöyleydi:

	+------+--------+---+---+-+---+-+------+
	|Offset|Selektör| 0 |Tip|S|DPL|P|Offset| 
	|  16  |   16   | 8 | 4 |1| 2 |1|  16  |   
	+------+--------+---+---+-+---+-+------+
      91d6    0800    00  e  -- e --  5380

Ve buradan çıkardığımız sonuç da şu oluyor,

* DPL = 3 (DPL bit olarak 11)
* Selektör -> `0000100000000 0 00` = decimal(0800) -> 00=RPL, 0=TI(Yani GDT), GDT İndex=1
* Offset1+Offset2 = `8053d691` -> Yani nt!KiSystemService'nin adresi.

Ayrıca bir de gördüğünüz gibi GDT için bi raw data var elimizde : `ff ff 00 00 00 9b cf 00`

Bunu da GDT tanımlayıcı yapısına göre ayırırsanız komutumuzun sonucunda elde ettiğimiz bilgileri elde edersiniz. Ortalığı daha da karıştırmamak için buna girmiyorum. Zaten API çağrılarından girdik nasıl olduysa IDT yapılarına kadar girdik. Önünü alamıyoruz... Neyse, şimdi son olarak çağırılan fonksiyonun nasıl anlaşıldığını öğrenelim. 

## Çağırılan Fonksiyon Nasıl Belirleniyor ?

Hatırlarsanız CreateFile fonksiyonu ile yola çıkmıştık. Peki bu son aşamaya geldiğimizde, `KiFastCallEntry` çağırdığımız fonksiyonu nasıl anlıyor ? Cevap **SSDT**(System Service Descriptor Table) olarak bilinen **KiServiceTable**da saklı. Hatırlarsanız, `ntdll!NtCreateFile`a bakarsak, SystemCallStub çağırılmadan önce `EAX` yazmacına **25h**, yani NtCreateFile fonksiyonunun ordinal değeri atılmıştı. İşte `KiFastCallEntry` bu değeri kullanarak çağrıyı yapıyor. Örneğin basitçe bu tablodaki her değer 4 byte olduğuna göre, tabloadresi+4*25 ifadesiyle fonksiyonumuza ulaşabiliriz. Bakalım;

	kd> dds nt!KiServiceTable+4*25 l5
		80501d14  8056e46e nt!NtCreateFile
		80501d18  8056de4c nt!NtCreateIoCompletion
		80501d1c  805cbb76 nt!NtCreateJobObject
		80501d20  805cb8ae nt!NtCreateJobSet
		80501d24  8061af8c nt!NtCreateKey

Görüldüğü gibi NtCreateFile fonksiyonuna ulaşmış oluyoruz. İşte `KiFastCallEntry` de aynen bu şekilde bu fonksiyonu gerekli parametreleri de hazırlayıp çağırıyor. Ayrıca meraklıları için bu tablonun adresi `KeServiceDescriptorTable` isimli tabloda tutuluyor. 

	kd> dds nt!KeServiceDescriptorTable l3
		805531a0  80501c80 nt!KiServiceTable
		805531a4  00000000
		805531a8  0000011c

Her iki örnekteki **l** ile belirtilen kaç adet girdinin gösterileceğidir. Son olarak açıklayıcı olması için her iki durumda da çağrının nasıl gerçekleştirildiğini görsel olarak görelim.

![](/files/api-cagrilari.png)

Öğrenmesi ve anlatması gerçekten güç bir şey. Ama elimden geldiğince açıklayıcı bir şekilde anlatmaya çalıştım. Yine de anlaşılmamış bir kısım olursa lütfen yorumlarda çekinmeden sorun, bunları yazıyorum ama sanırım kimse okumuyor, arada bir umutsuzluğa düşmüyorum değil. Sonraki yazıda benim de kafamı çok karıştırmış olan Ntxxx ve Zwxxx şeklindeki fonksiyonların farkını anlatmayı hedefliyorum. Veyahut öneri gelirse ordan da gidebilirim!

Sevgiler, teşekkür ederim.

----
* [system call dispatcher](http://www.nynaeve.net/?p=48)
* [sysenter](http://wiki.osdev.org/SYSENTER)
* [sysenter2](http://x86.renejeschke.de/html/file_module_x86_id_313.html)
* [Kesme ve İstisna Yönetimi](/posts/isletim-sistemlerinde-kesme-ve-istisna-yonetimi)
* [IDT](http://wiki.osdev.org/Interrupt_Descriptor_Table)
