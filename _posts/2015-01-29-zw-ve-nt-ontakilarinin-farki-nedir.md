---
title: Zw ve Nt Öntakılarının Farkı Nedir? 
---

Tekrar merhabalar, iki gün evvel yazdığım yazından sonra bahsettiğim konuyu da hemen aradan çıkarmak istedim. Zaten fazla teknik bir şey olmadığı için uzun bir yazı olmayacak ama aradaki farkı anlatabilmeyi umuyorum. 

Şimdii, öncelikle ben neyi anlatacağım ? Şöyle ki, eğer kernel seviyesinde gezinirseniz örneğin `ntdll` içerisinde hem `ZwCreateFile`, hem de `NtCreateFile` fonksiyonlarının olduğunu görürsünüz. Haliyle "*bu ne lahana turşusu*" moduna geçebilirsiniz. Örneğin gelin birlikte `ntdll.dll` (dikkat edin, user-mode) içerisindeki export edilen fonksiyonlara** dumpbin** yardımcısını kullanarak bakalım. Bunun için `dumpbin /exports dosya` şeklinde programı çalıştırıp, çıktıyı görebilirsiniz. Ben tüm exportları buraya yazmıyorum fakat listeyi incelerseniz **NtXXX** şeklinde olan fonksiyonların çoğu, birkaç istisna dışında aynı zamanda **ZwXXX** şeklinde de tanımlanmış. Örneğin; 

    595  24A 00093090 NtUnloadDriver	---->   1973  7AC 00093090 ZwUnloadDriver
    596  24B 000930A0 NtUnloadKey       ---->   1974  7AD 000930A0 ZwUnloadKey
    597  24C 000930B0 NtUnloadKey2      ---->   1975  7AE 000930B0 ZwUnloadKey2

Dikkat ederseniz her ikisinin de aynı RVA'da bulunduklarını görebilirsiniz. Peki bu durum bu iki fonksiyonun aynı olduğunu mu gösterir ? Eğer user-mode tarafında konuşuyorsak: evet! Kanıt olarak user mode tarafında çalışan bir programı debug ederek, bu iki fonksiyonun disassemble çıktılarına bakabiliriz. Aşağıda Windows 7 32 BIT bir sistemdeki iki fonksiyonun user-mode tarafındaki disassemble edilmiş çıktılarını görüyorsunuz.

	0:000> u ntdll!ZwUnloadDriver
	ntdll!NtUnloadDriver:
		776f5da0 b87b010000      mov     eax,17Bh
		776f5da5 ba0003fe7f      mov     edx,offset SharedUserData!SystemCallStub (7ffe0300)
		776f5daa ff12            call    dword ptr [edx]
		776f5dac c20400          ret     4
		776f5daf 90              nop
	0:000> u ntdll!NtUnloadDriver
	ntdll!NtUnloadDriver:
		776f5da0 b87b010000      mov     eax,17Bh
		776f5da5 ba0003fe7f      mov     edx,offset SharedUserData!SystemCallStub (7ffe0300)
		776f5daa ff12            call    dword ptr [edx]
		776f5dac c20400          ret     4
		776f5daf 90              nop

O kadar aynılar ki, ikinci defa `u` komutuyla disassemble etmeden direk kopyala yapıştır yapıp, Zw'yi Nt yaptım, ehehe. Burada gerçekleşen olayları zaten [önceki](/posts/api-cagrilari-system-call-dispatcher-ve-dahasi.html) yazıda aktarmaya çalışmıştım. Yani kısaca şunu diyelim, çağırılan API user-mode tarafında çağırılıyorsa, hem *ZwXXX* hem de *NtXXX* birbirinin aynısıdır. Ve bu iki fonksiyon da en sonunda `nt!UnloadDriver`'ı çağıracak, bakınız o da şu oluyor :

	kd> u nt!NtUnloadDriver
	nt!NtUnloadDriver:
		82d0e827 8bff            mov     edi,edi
		82d0e829 55              push    ebp
		82d0e82a 8bec            mov     ebp,esp
		82d0e82c 8b4d08          mov     ecx,dword ptr [ebp+8]
		82d0e82f 6a00            push    0
		82d0e831 e80e000000      call    nt!IopUnloadDriver (82d0e844)
		82d0e836 5d              pop     ebp
		82d0e837 c20400          ret     4



Peki, şimdi madem bu *ZwXXX* ve *NtXXX* user-mode tarafında aynı, o zaman neden bu ayrım var ? Şöyle ki, bu API çağrıları basitçe 4 şekilde gerçekleşebiliyor;

* User-mode tarafında Nt öntakısıyla çağırılır
* User-mode tarafında Zw öntakısıyla çağırılır
* Kernel-mode tarafında Nt öntakısıyla çağırılır
* Kernel-mode tarafında Zw öntakısıyla çağırılır

İlk iki seçeneğin birbirinin aynısı olduğunu hem biraz önce, hem de daha önceki yazıda birlikte gördük değil mi ? Demek ki diğer iki seçenekte bir olay var. Demek ki API fonksiyonları kernel-mode tarafında çağırılınca bir olay oluyor. O zaman şimdi bir de kernel-mode'dan bu iki fonksiyona bakalım. 

## Kernel Modundan API Çağırma
Öncelikle yine **Zw** öntakılı ve **Nt** fonksiyonlarının kernel-mode tarafındaki disassemble çıktılarına bakalım.

	kd> u nt!ZwUnloadDriver
	nt!ZwUnloadDriver:
		82a95730 b87b010000      mov     eax,17Bh
		82a95735 8d542404        lea     edx,[esp+4]
		82a95739 9c              pushfd
		82a9573a 6a08            push    8
		82a9573c e8ed0a0000      call    nt!KiSystemService (82a9622e)
		82a95741 c20400          ret     4
	kd> u nt!NtUnloadDriver
	nt!NtUnloadDriver:
		82d0e827 8bff            mov     edi,edi
		82d0e829 55              push    ebp
		82d0e82a 8bec            mov     ebp,esp
		82d0e82c 8b4d08          mov     ecx,dword ptr [ebp+8]
		82d0e82f 6a00            push    0
		82d0e831 e80e000000      call    nt!IopUnloadDriver (82d0e844)
		82d0e836 5d              pop     ebp
		82d0e837 c20400          ret     4

Bakın işte, Nt öntakısı olan fonksiyona bakarsanız, UnloadDriver'ın en sonunda ulaşacak olduğu, yani SSDT'de olan fonksiyon bu. Peki Zw öntakılı olan nedir öyle ? Gördüğünüz gibi user-mode tarafında gördüğümüz fonksiyonun biraz benzeri gibi. Kontrol ederseniz ikisinin de başında `mov eax, 17Bh`, yani fonksiyon ordinal değerinin **EAX** yazmacına atılması var. Fakat sonrasında işler değişiyor. Ardından `lea edx,[esp+4]` yardımıyla parametreleri gösteren bi pointerı EDX yazmacına alıyoruz. Ardından **EFLAGS** ve sabit bir değer stacke atılıyor. En sonunda da `nt!KiSystemService` çağırılıyor.

İki fonksiyona tekrar bakarsak, biri direkt olarak SSDT'de bulunan `NtUnloadDriver`, diğeri ise en sonunda ona giden bir ara fonksiyon. Belki "*peki ZwUnloadDriver neden **sysenter** çalıştırmıyor ?*" diyebilirsiniz. Çalıştırmıyor çünkü şu anda zaten kernel modundayız, haliyle gerek yok.. Peki fark nedir ? Şudur: bu fonksiyonlar çağırılırken **PreviousMode** denilen bir değer var, işte bu değer fonksiyonu çağrı yapan tarafı kernel'a bildiriyor, bu sayede kernel çağırana güvenip güvenmeyeceğini anlıyor. Mesela user-mode tarafından gelen çağrılar için PreviousMode değeri user-mode'u işaret eder. Yani bu şekilde kernel'a şunu deriz: "*Arkadaş, bu çağrı user-mode tarafından geliyor, yani dikkat et, meksikalılar sevkiyatta sakatlık yapabilir.*". Burada olan olay da budur. Eğer kernel-mode tarafında Zw öntakılı fonksiyonları çağırırsanız, PreviousMode değeri kernel-mode'u işaret eder. Bu da kernel için şunu ifade eder: "*Bu adamın PreviousMode'u kernel-mode. Demek ki bu adama güvenebilirim hacı.*".

Yani son olarak, eğer kernel-mode tarafında API çağrısı yapacaksak, Zw öntakılı olanları çağırmalıyız. Çünkü onlar PreviousMode değerini kernel-mode'u gösterecek şekilde ayarlıyorlar. Fakat, eğer Nt öntakılı fonksiyonu çağırırsanız PreviousMode değeri değişmez! Bu farka dikkat etmeliyiz, aksi taktirde kernel fonksiyonunuza önyargıyla yaklaşır ve birtakım güvenlik kontrollerinden geçirir. Şunu unutmayın, kernel, kendi tarafında olan herkese güvenilir gözüyle bakar. Eğer merak ederseniz `nt!NtUnloadDriver`'ı disassemble ederek bu kontrollerin yapıldığını teyit edebilirsiniz. 

Sevgiler, teşekkür ederim..

---
* [PreviousMode - MSDN](https://msdn.microsoft.com/en-us/library/ff559860(VS.85).aspx)
* [Native API - Wikipedia](http://en.wikipedia.org/wiki/Native_API)
* [DUMPBIN](http://support.microsoft.com/kb/177429/tr)
* [OSROnline - Nt vs. Zw](http://www.osronline.com/article.cfm?name=osrntapi.zip&id=257)
* [Yazarken dinlediğim](https://www.youtube.com/watch?v=8nCgrZ7N1Ks)
