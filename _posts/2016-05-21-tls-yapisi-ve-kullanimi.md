---
title: TLS yapısı ve kullanımı
---

Selamlar

**TLS**, yani tarzancası *Thread Local Storage*(İşlemcik Yerel Deposu), Windows işletim sisteminde her işlemciğin kendisine özgü veri saklayabilmesini mümkün kılan bir mekanizmadır. **TLS** sayesinde her işlemciğin kendisine özgü veri saklayabileceği bir alan oluşturabilir, daha sonra bir indeks ile diğer işlemcikler tarafından bu veriye ulaşabiliriz. Bu yazıda **TLS**'nin hem işletim sistemi tarafında hem de yazıdığınız programlarda nasıl kullanıldığına dair kısa notları paylaşıcam. Öncelikle üst tarafa bakalım, ardından işletim sistemi tarafından devam edecez.

## Uygulamalarda TLS kullanımı
Uygulamalarınızda iki çeşit **TLS** kullanımından söz edebiliriz. Bunlardan ilki *dinamik*, diğeri ise *statik*. **Dinamik** yöntemde [Windows'un bize sunduğu **TLS** fonksiyonları](https://msdn.microsoft.com/en-us/library/windows/desktop/ms686997(v=vs.85).aspx)nı kullanıyoruz, **statik** yöntemde ise bir fonksiyon kullanmadan kod içerisinde bazı ön ekler sayesinde derleyiciye tanımladığımız değişkenin **TLS** içerisinde saklanması gerektiğini bildiriyoruz. Statik yöntem hem derleyici, hem bağlayıcı(linker) hem de dosyayı hafızaya yükleyip çalıştıracak olan yükleyici tarafından desteklenmeli. Eğer dinamik yöntemi kullanacaksak, **TLS** tahsisi işlemi, işlemin yahut eğer **DLL** ile kullanıyorsanız **DLL**'in başlatılması sırasında ayrılıp(`DLL_PROCESS_ATTACH` sırasında), kapatılması sırasında ise(DLL için `DLL_PROCESS_DETACH` sırasında) serbest bırakılmalı.

### TLS'nin dinamik kullanımı
**TLS**'i dinamik olarak kullanırken dediğimiz gibi Windows'un bize sunduğu *4* fonksiyonu kullanıyoruz. Genelde **DLL** geliştirilmesi sırasında daha çok kullanılıyorlar. Bu fonksiyonlara kısaca bi bakınca zaten olay hemen anlaşılıyor (En azından uygulama tarafında). **TLS** ile ilgili güzel bir görsel de aşağıda görülebilir, [MSDN](https://msdn.microsoft.com/en-us/library/windows/desktop/ms686749(v=vs.85).aspx) sayfasından:

![](/files/mstlsozet.png)

Görüldüğü üzere her işlemciğin kendine ait bir **TLS**'i var. Bu **TLS** kendi içerisinde slot adı verilen yerler içeriyor. Ve birtakım fonksiyonlar aracılığıyla burada yer edinip, oraya veri ekleyebiliyor-silebiliyoruz. **TLS**'in minimum boyutu **64** slot olarak garanti edilmiş, o da `TLS_MINIMUM_AVAILABLE` sabitinde belirtiliyor. İşlem başına maksimum *TLS* slotu ise **1,088** taneye kadar çıkabiliyor (Ayrıntılar geliyor..).

#### TlsAlloc
Bu fonksiyon bir adet **TLS** slotu indeks numarası döner. Her işlemcik bu indeks numarasını kullanıp kendine ait olan **TLS** içerisindeki belirtilen slota ulaşabilir. Fonksiyon bir indeksi ayırdığı zaman o indekse ait **TLS** slotu `NULL` ile doldurulur ve ayrılmış olan bu **TLS** slotu, işlem(process) içerisindeki işlemcikler tarafından kendine has veri depolamak için kullanılmaya başlanabilir. Prototipi :

    DWORD WINAPI TlsAlloc(void);

Fonksiyon başarılı olursa dediğimiz gibi indeks dönüyor, aksi halde ise `TLS_OUT_OF_INDEXES` döner. Sonuca dair detaylı bilgi için ise `GetLastError` fonksiyonu kullanılabilir.

#### TlsFree
Fonksiyon adından anlaşılabileceği gibi bir **TLS** slotunu tekrar kullanılabilir hale getirir, yani serbest bırakır onu. Prototipi şöyle:

    BOOL WINAPI TlsFree(
      _In_ DWORD dwTlsIndex
    );

**dwTlsIndex**, `TlsAlloc`'dan dönen **TLS** indeks numarası. Bu fonksiyonu kullanmadan önce eğer kullandığımız **TLS** slotu ayrılmış bir hafızaya sahipse, orasını da serbest bırakmayı unutmamalıyız.

#### TlsSetValue 
Bu fonksiyon verilen indekse sahip **TLS** slotuna `LPVOID` türünde bir veri koyar. Prototipi şöyle:

    BOOL WINAPI TlsSetValue(
      _In_     DWORD  dwTlsIndex,
      _In_opt_ LPVOID lpTlsValue
    );

**dwTlsIndex**, `TLS` slot indeksi, *lpTlsValue* ise verilen **TLS** slotunda saklanacak değer. Fonksiyon bildiğim kadarıyla indeks üzerinde dikkatli bi şekilde durarak doğrulamıyor, baktığı şey indeks değerinin **0** ile `TLS_MINIMUM_AVAILABLE-1` arasında olup olmadığı. Özellikle ek Tls alanı kullanırken dikkat etmemiz lazım (Detaylar aşağıda..).

Fonksiyon başarılı olursa sıfır dışında bir değer dönüyor, başarısız olursa sıfır.

#### TlsGetValue 
Son fonksiyon ise isminden anlaşıldığı gibi verilen **TLS** slotundaki veriyi okuyup bize veriyor.

    LPVOID WINAPI TlsGetValue(
      _In_ DWORD dwTlsIndex
    );

Fonksiyon başarılı olursa **TLS** slotundaki veriyi, aksi durumda ise **sıfır** dönüyor. Fakat şöyle bir şey var, bu **TLS** slotundaki **veri sıfır da olabilir**. Bu nedenle sadece fonksiyonun geri dönüş değerine bakmak yeterli değil, ayrıca `GetLastError` fonksiyonu ile son hata kodunun `ERROR_SUCCESS` **olmadığını** doğrulamalıyız. Eğer bu hata kodunu alıyorsak demek ki **TLS** slotundaki veri sıfır demektir. 

Bu arada, bu fonksiyon da `TlsSetValue` gibi minimum düzeyde indeks doğrulaması yapıyor aklınızda bulunsun.

Bu dört fonksiyonun topluca kullanımına güzel bir örnek MSDN üzerinde var. Aynen buraya Türkçe yorumlayarak alıyorum, gayet yeterli.

    #include <windows.h> 
    #include <stdio.h> 
     
    #define THREADCOUNT 4 
    DWORD dwTlsIndex; 
     
    VOID ErrorExit(LPSTR); 
     
    VOID CommonFunc(VOID) 
    { 
       LPVOID lpvData; 
     
       // İşlemciğin kendine ait verisinin yerini alalım
       lpvData = TlsGetValue(dwTlsIndex); 
       if ((lpvData == 0) && (GetLastError() != ERROR_SUCCESS)) 
          ErrorExit("TlsGetValue error"); 
     
       // Bu işlemciğe ait veriyi görelim
       printf("common: thread %d: lpvData=%lx\n", 
          GetCurrentThreadId(), lpvData); 
     
       Sleep(5000); 
    } 
     
    DWORD WINAPI ThreadFunc(VOID) 
    { 
       LPVOID lpvData; 
     
       // Bu işlemciğin TLS indeksinde olacak veriyi ayarla
       lpvData = (LPVOID) LocalAlloc(LPTR, 256); 
       if (! TlsSetValue(dwTlsIndex, lpvData)) 
          ErrorExit("TlsSetValue error"); 
     
       printf("thread %d: lpvData=%lx\n", GetCurrentThreadId(), lpvData); 
     
       // İşlemcik içinden bi fonksiyon çağırıp bakalım ordan da veriye ulaşabilcez mi
       CommonFunc(); 
     
       // İşlemcikten dönmeden öncek ayırdığımız veriyi de yok edelim
       lpvData = TlsGetValue(dwTlsIndex); 
       if (lpvData != 0) 
          LocalFree((HLOCAL) lpvData); 
     
       return 0; 
    } 
     
    int main(VOID) 
    { 
       DWORD IDThread; 
       HANDLE hThread[THREADCOUNT]; 
       int i; 
     
       // Kullanılacak TLS indeksini al 
       if ((dwTlsIndex = TlsAlloc()) == TLS_OUT_OF_INDEXES) 
          ErrorExit("TlsAlloc failed"); 
     
       // İşlemcikleri oluştur 
       for (i = 0; i < THREADCOUNT; i++) 
       { 
          hThread[i] = CreateThread(NULL,  
             0,                            
             (LPTHREAD_START_ROUTINE) ThreadFunc,  
             NULL,                     
             0,                       
             &IDThread);              
     
       // İşemcik oluşturuldu mu diye test et 
          if (hThread[i] == NULL) 
             ErrorExit("CreateThread error\n"); 
       } 
     
       // İşlemciklerin bitmelerini bekle
       for (i = 0; i < THREADCOUNT; i++) 
          WaitForSingleObject(hThread[i], INFINITE); 
     
       // Ayırılan TLS indeksini serbest bırak 
       TlsFree(dwTlsIndex);

       return 0; 
    } 
     
    VOID ErrorExit (LPSTR lpszMessage) 
    { 
       fprintf(stderr, "%s\n", lpszMessage); 
       ExitProcess(0); 
    }

Çıktısı şu şekilde:

    thread 1044: lpvData=6e09e0
    thread 5644: lpvData=6e4e80
    common: thread 5644: lpvData=6e4e80
    thread 2344: lpvData=6e2648
    common: thread 2344: lpvData=6e2648
    thread 3564: lpvData=9464c8
    common: thread 3564: lpvData=9464c8
    common: thread 1044: lpvData=6e09e0

Dikkat edilirse her işlemciğin **TLS** indeksinde kendine ait veri var. Ve o işlemcik içerisinden çağırılan fonksiyonlar da bu veriye erişebiliyor.

### TLS'nin statik kullanımı
**TLS**'in statik kullanımda ise fonksiyonları kullanmak yerine direk kod içerisinde Microsoft derleyicilerinde `__declspec(thread)` etiketini kullanıyoruz. Şuna dikkat etmek lazım bu etikete sahip değişkenler statik-global olmalılar. Yerel değişkenlerde bu etiketi kullanamıyoruz. Ve yine bu etikete sahip veriler otomatik olarak `.tls ` isimli bir bölüme koyuluyorlar. İşletim sistemi dosyayı hafızaya yüklediği sırada bu bölüme bakarak buradan **TLS** verisini elde ediyor.

Statik kullanımın bildiğim *dezavantajı* ise şu, bu yöntemi kullanırken eğer modülünüz(DLL misali) hafızaya sonradan yükleniyorsa bu statik yöntem çalışmıyor. Yani şunu diyebiliriz ki bu durumda bu yöntem işlemin kendi dosyası(.exe) veya işlemin oluşturulması sırasında hafızaya eşleneceği garanti edilmiş modüller dışında kullanışlı değil.

## İşletim sistemi tarafında TLS uygulanışı
Basit olarak **TLS**, her işlemciğin kendine ait **TEB**(Thread Environment Block) yapısı üzerinden erişilir ve işletim sistemi tarafından organize edilir. **TEB**'e erişimin de `x86` sistemlerde **FS** `x64` sistemlerde ise **GS** segment yazmaçları üzerinden kolayca yapıldığını da düşünürsek neden burada tutuldukları da biraz gün ışığına çıkıyor.

Sistemdeki her işlemcik oluşturulurken o işlemciğin kendisine ait **TLS** slotları için `NULL` değeri verilmiş bir `LPVOID` dizisi de oluşturulur. Bu ilk oluşturulan dizi 64 girdiye sahiptir. Dizideki her bir slot işlemciklerin kullanabileceği bir TLS alanı anlamına gelmektedir. Ah, bu arada saklamak istediğiniz değer `LPVOID` bir alana sığıyorsa veriyi direkt bu slot içerisinde de saklayabilirsiniz, ayırdığınız bir adresi saklamak yerine. Devrik cümle kuruyorum bol bol, nedendir çözemedim ha.

Yukarıda dinamik kullanımda bahsettiğimiz fonksiyonlardan veriyi koyan-alan fonksiyonlar **TEB** içerisinde bulunan ve bahsettiğimiz TLS slotlarını içeren bir dizide bunu yapıyorlar, o da **TlsSlots**. (Aslında bir de **TlsExpansionSlots** var istek yapılması durumunda, 2 tane diyelim). Bizim `TlsAlloc` ile elde ettiğimiz indeks numarası işte bu **TlsSlots** içerisinde bize bir slot veriyor. Misal hiç **TLS** kullanmayan bir programda **TEB**'e bakarsak bu alanın (aşağıda aslında ilk indeksin) **NULL** durumda olduğunu görebiliriz (Tabi burda bir tashih yapmam lazım, ben sadece ilk indekse baktım, `dd` ile tüm diziye bakmamız lazımdı ama bunu şimdi fark edip üşendiğim için böyle bırakıyorum).

    0:000> dt _TEB @$teb TlsSlots
    ntdll!_TEB
       +0xe10 TlsSlots : [64] (null) 

Misal, `TlsAlloc` fonksiyonu incelersek şöyle bir şey çıkıyor karşımıza (Kodu kesip biçtim biraz). Anlamadığınız kısımlar olabilir, kodun devamında açıklama geçeceğim sabırlı olmalıyız:

    signed int __stdcall TlsAlloc()
    {
      _PEB *Peb; 
      struct _TEB *Teb; 
      int Index;

      Peb = NtCurrentTeb()->ProcessEnvironmentBlock;
      Teb = NtCurrentTeb();

      // PEB'e erişip işlem yapacağımız için kritik alana 
      // giriş yapıyoruz bu sayede senkronizasyon
      // sağlanmış olacak, güvenlik için önemli bu
      RtlAcquirePebLock();
      
      // Bu fonksiyon PEB içerisindeki TLS bitmap'i kullanarak
      // kullanılmayan(biti 0 olan) bir TLS bulup onun indeksini veriyor
      // ve tabiki TlsBitmap içerisinde bu alanı gösteren biti kullanıldı olarak
      // işaretliyor (1 yapıyor).
      Index = RtlFindClearBitsAndSet((int)Peb->TlsBitmap, 1, 0);
      if ( Index == -1 )
      {
        // Öntanımlı slotlarda yer kalmamış, o halde TlsExpansion'a bakalım.
        // Aşağıda açıklayacam TlsExpansion olayını
        Index = RtlFindClearBitsAndSet((int)Peb->TlsExpansionBitmap, 1, 0);

        if ( Index != -1 )
        {
          // TlsExpansionSlots alanımız var mı?
          if ( !Teb->TlsExpansionSlots )
          {
            // Yok. O halde hemen işlemin heap'inden bir tane ayarlayalım
            Teb->TlsExpansionSlots = RtlAllocateHeap(NtCurrentTeb()->ProcessEnvironmentBlock->ProcessHeap, 
                                                     BaseDllTag | 8, 
                                                     4096);
            // Ayarladık mı?
            if ( !Teb->TlsExpansionSlots )
            {
              // Ayarlayabilemedik
              RtlClearBits(Peb->TlsExpansionBitmap, Index, 1);
              return -1;
            }
          }

          // Alanımız var, o halde bulduğumuz Index'i hazır hâle getirelim
          Teb->TlsExpansionSlots[Index1] = 0;
          // +64 tahminimce şundan, standart TLS slotları toplamda
          // 64 tane ya, siz eğer 64den yukarda bi indeks ayırısanız
          // ek slotlara bakılıyor, ama bu ek yerde index tekrar 0'dan başlıyor
          // bu nedenle +64 ekleyerek slot indekslerinin çakışması engelleniyor
          Index += 64;
        }
      }
      else
      {
        // Başarıyla bir indeks elde ettik o halde TEB içerisindeki seçtiğimiz 
        // TLS slotuna 0 değerini verelim
        Teb->TlsSlots[Index] = 0;
      }

      // Kritik alandan çık
      RtlReleasePebLock();
      return Index;
    }

Fonksiyonun kullandığı *TlsSlots* **TEB**(Thread Environment Block) içerisindeki olduğu için her işlemciğin kendi **TlsSlots** alanı var. Şöyle diyeyim, işletim sisteminde esas çalıştırılan işlemciklerdir. İşlem ise işlemcikleri kapsayan, içerisinde tutan bir yapıdır. **PEB** dediğimizde *işlem*'i, **TEB** dediğimizde ise *işlemciği* kastediyoruz demektir. İşlemi bir bina olarak düşünürseniz, işlemcikler de onun içinde bulunan dairelerdir gibi canlandırabilirsiniz dimağınızda.

Bu yapı sayesinde her işlemcik kendine ait **64** **TLS** slotuna sahip oluyor("*Hani **1,088**'e kadar oluyodu yahu?*" diyenler ha şimdi geliyoz oraya). **TlsExpansionSlots** dediğimiz şey ise, bir süre sonra Microsoft'un **64** slotun yeterli olmayacağını düşünüp eklediği ek bir **TLS** alanı. `TlsAlloc` **64** slotun üzerinde bir ayırma yaptığında otomatik olarak bu ek alanı kullanmaya başlıyor. `TlsAlloc` fonksiyonu içerisinde bu alan kontrol ediliyor eğer henüz oluşturulmamış ise oluşturma işlemini de bu fonksiyon yapıyor ve istenen slot buradan ayrılıyor. Bu ek alan ise **1024** slota kadar izin veriyor. E bu da yazının başında değindiğimiz **1,088** slot olayını açıklığa kavuşturuyor.

`TlsAlloc` ve `TlsFree` fonksiyonları **TLS** slotlarının takibini yapmak için *bitmap* kullanıyorlar. Basitçe her bit'in bir slotu temsil ettiği bir sistem düşünebilirsiniz. Zaten dikkat ederseniz `RtlFindClearBitsAndSet` fonksiyonununa bir *bitmap* veriyoruz. **TLS** slotlarının durumunu gösteren bu bitmapler **PEB** içerisinde bulunan **TlsBitmap** ve **TlsExpansionBitmap** ile belirtiliyor. Fonksiyon bu bitmap alanları içerisinde bir boş alanı(bit 0 oluyor bu durumda) işaret eden bir bit buluyor ve "*oo burayı aldım ben müdür, işaretleyeyim*" deyip bulduğu yerin numarasını, yani indeksimizi bize veriyor. Bu indeksi daha sonra TEB içerisinde bulunan TLS dizisinde kullanıyoruz.

Şunu da ekleyelim, **TlsExpansionSlots** alanı işlemciğin sonlanması sırasında işletim sistemi tarafından serbest bırakılıyor. Zaten ilgili fonksiyonları incelerseniz bu alanın işlemin öntanımlı **heap**i üzerinden ayrıldığını da görebilirsiniz. Bir de eğer işlemcikten `TerminateThread` ile çıkarsanız bu alan serbest bırakılmıyor. Yani işlemcikten dışarı veri sızmasına sebep olabiliyor. Peki hiç mi yok edilmeyecek bu alan derseniz, hayır, işletim sistemi işlem sonlandığında bu alanı da yok ediyor. Ama yine de `TerminateThread`'i kullanmaktan kaçınmalısınız.

Son olarak yukarıdaki fonksiyonda **Index** değişkenine 64 eklenmesini kısaca açıkladım fakat eğer bir soru işareti kaldıysa `TlsGetValue` fonksiyonunun bir bölümüne bakıp olayı biraz daha netleştirebiliriz, bakınız:

    Teb = NtCurrentTeb();
    if ( Index < 0x40 ) // 0x40, 64 ediyor onluk sistemde
    {
      // İndeks 64'den küçükse direk TlsSlots içerisinden
      // bu alandaki veriyi alıyoruz. Ayrıca "sıkıntı yok"
      // demek için de LastErrorValue sıfır yapılıyor
      Teb->LastErrorValue = 0;
      return Teb->TlsSlots[Index];
    }
    if ( Index >= 0x440 ) // 0x440, 1,088 yapıyor
    {
      // Hmm, adam öyle bi index verdi ki cook buyuk
      // boyle bir TLS slot numaramiz yok hata verecez el mahkum
      stat = RtlNtStatusToDosError(-1073741811);
      SetLastError(stat);
      return 0;
    }
    // TlsExpansionSlots kullanıyoruz, indeks 64 üzerinde
    Teb->LastErrorValue = 0;
    // Yoksa TlsExpansionSlots alanımız da mı yok?
    if ( !Teb->TlsExpansionSlots )
      return 0; // Aynen, yok..
    //Hayır, var. O halde indeks numarasını hizalayıp veriyi döndürelim.
    return Teb->TlsExpansionSlots[Index - 64];

Sanırım yorumlarla beraber yeterince anlaşılır olmuştur.. Bir de son olarak canlı kanlı bir örneği de kısaca gösterip bitiriyoruz. Yukarıda MSDN üzerinden aldığımız örnek program çalıştığında debug eder, ve **3564**(`0xdec`) numaralı işlemciğin **TEB**'inde bulunan **TlsSlots**'a bakarsanız ayrılan slota verinin eklendiğini görebilirsiniz.

    0:005> dd @$teb+0xe10 l2
    003b8e10  00000000 009464c8

Buradaki `0xe10` uzaklığı **TlsSlots** dizisine ait haberiniz olsun. Veriyi de orada görüyorsunuz.. 

Sevgiler
