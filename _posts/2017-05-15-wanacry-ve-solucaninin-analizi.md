---
title: Wanacry ve Solucanının Minik Bir Analizi
categories: Bilgisayar
---

Selamlar. Ben bu yazıyı size otobüs terminalinde beklediğim sırada yazarken aynı zamanda dünyada sağda solda sürekli konuşulan bir zararlı yazılım yayılmaya devam ediyor. Bu yazı da onun nasıl yayıldığının kısa ve küçük bir teknik analizi niteliğinde. O kadar ki haber sitelerine falan düşmüş artık konu, efendim işte bilmem ne tarihinin en güçlü siber saldırısı gibi lanse edilmiş fakat bunlar sadece haber sitelerin her konuda yaptığı abartmalardan ibaret kanımca. Çünkü esasen biraz bilinçli bir kullanıcı olmak hemen hemen bir çok zararlı karşısında size yeterli korumayı sağlıyor ayrıca teknik olarak da fidye yazılımı kısmının çok abartılacak bir yanı yok ama sömürgeç(exploit) kesinlikle hoş diyebiliriz. Bu arada, evet eğer olayı bir anda bir çok yeri etkileyebilmesi açısından düşünürseniz ciddi bir zararlı. Ayrıca benim dilim yanmadığı için de konuşmak biraz kolay oluyor fakat arşivlerim şifrelense herhalde ben de çıldırma durumuna gelebilirim...

Öncelikle neyden bahsettiğimi görsel olarak anlatmak gerekirse, şu arkadaştan bahsediyorum:

![](/files/sifrelenmekmistiyon.png)

Fidye yazılımının teknik analizini yapmayacağım lakin o da tıpkı diğerleri gibi dosyaları alıp şifrelemekten başka bir şey yapmıyor... Nasıl yayıldığı konusuna gelirsek geçenlerde ortaya çıkan **ETERNALBLUE** isimli sömürgeçin(exploit) sömürdüğü zafiyet([MS17-010](https://technet.microsoft.com/en-us/library/security/ms17-010.aspx)) üzerinden yayılıyor. Bu zararlıdan başınızın ağrımasını istemiyorsanız sisteminizi acilen güncellemeniz gerekiyor. Güncelleme yapmadıysanız **445** portuna dıştan gelebilecek tüm istekleri engellemeniz şimdilik sizi kurtarabilir. Aslında bir de sanırım 139 portu varmış, fakat benim incelediğim zararlılar bu portu kullanmıyor, paranoyak iseniz engellebilirsiniz.

Yayılmada kullanılan çalıştırılabilir dosya ile ilgili ilk göze çarpan şey kendisi hakkında sahte bilgiler öne sürmesi:

![](/files/solucan_sahte_bilgiler.png)

Bu arkadaş çalıştığında öncelikle `iuqerfsodp9ifjaposdfjhgosurijfaewrwergwea.com` isminde bir adrese bağlanmaya çalışıyor, eğer bu adrese bağlanabilirse program kendini durduruyor. Burası gariptir, elemanlardan biri bu adresi gidip almış. Böylece bu solucanın yayılmasına da bir nebze engel olmuş. Ama anlamadığım şey bunu yazan adamlar hangi kafayla böyle bir aptallık yapmışlar? Hoş, ahlaken bakınca iyi olmuş o kadar masum insan buna yakalanmaktan kurtulmuş. Ama bir de zararlıyı geliştirenlerin bakış açısına göre bakınca garip oluyor biraz. Bazıları zararlının yayılmasını istediklerinde durdurabilmek için yazan kişilerin böyle bir şey eklediğini söylüyor ama mantıklı bir açıklama mı tartışılır...

Neyse efendim, bu solucanın ilk çalışan fonksiyonu şöyle:

```
  hInt = InternetOpenA(0, 1u, 0, 0, 0);
  hInt2 = InternetOpenUrlA(hInt, &BaglanBuraya, 0, 0, 0x84000000, 0);
  if ( hInt )
  {
    InternetCloseHandle(hInt);
    InternetCloseHandle(hInt2);
    sonuc = 0;
  }
  else
  {
    InternetCloseHandle(hInt);
    InternetCloseHandle(0);
    Solucan();
    sonuc = 0;
  }
  return sonuc;
```

Yukarıda dediğimiz gibi sözü geçen adrese bağlantı kurulamazsa `Solucan` ismini verdiğim fonksiyon çalışmaya başlıyor, sonrasında programın kaç adet argüman verilerek çalıştığını test ediyor. Eğer ikiden daha az argüman verilmişse program bir adet servis oluşturuyor ve kendi içindeki kaynaklar kısmında bulunan fidye yazılımı da dışarıya çıkartıp çalıştırıyor. Eğer iki veya daha fazla argüman ile çalıştırıldıysa, bu defa yayılma işini yapan solucan kodu devreye giriyor. Burada olay aslında şu, adamlar hem bulaştıkları bilgisayara fidye yazılımı koyup hem de başka bilgisayarlara bulaşmak istiyorlar ya, hah işte onun ilk çalıştıklarında (ikiden az argüman durumu) bir servis oluşturuyorlar ve kaynaklarda bulunan fidye yazılımını çıkartıp bu bilgisayarda çalıştırıyorlar. Kendilerini servis olarak da ekledikleri için işletim sistemi bu servisi çağırdığında (iki veya daha fazla argüman durumu) bu defa zararlı diğer bilgisayarlara bulaşma işlemini gerçekleştirebiliyorlar.

Bu bahsi geçen fonksiyon şu şekilde:

```
BOOL Solucan()
{
  BOOL sonuc; 
  SC_HANDLE hServisTutamak;
  SC_HANDLE hServisTutamak2;
  SERVICE_TABLE_ENTRYA ServiceStartTable; 

  if ( argc >= 2 )
  {
    hServisTutamak2 = OpenSCManagerA(0, 0, 0xF003Fu);
    if ( hServisTutamak2 )
    {
      hServisTutamak = OpenServiceA(hServisTutamak2, ServisAdi, 0xF01FFu);
      if ( hServisTutamak )
      {
      	// zaten var
        CloseServiceHandle(hServisTutamak);
      }
      CloseServiceHandle(hServisTutamak2);
    }
    ServiceStartTable.lpServiceName = ServisAdi; // mssecsvc2.0
    ServiceStartTable.lpServiceProc = (LPSERVICE_MAIN_FUNCTIONA)Bulastirici;

    sonuc = StartServiceCtrlDispatcherA(&ServiceStartTable);
  }
  else
  {
    sonuc = SolusturVeFidyele();
  }
  return sonuc;
}
```

Programın ilk çalışma durumunda çağırılan arkadaşımız `SolusturVeFidyele` kendi içerisinde iki fonksiyon çağırıyor. Bunlardan bir tanesi solucanı servis olarak ekliyor. Diğeri ise solucanın kaynaklar kısmında bulunan fidye yazılımını çıkarıp çalıştırıyor. Servisi oluşturma kısmı zaten oldukça basit, `mssecsvc2.0` isminde ve açıklama kısmında `Microsoft Security Center (2.0) Service` olan bir servis oluşturduktan sonra o servisi başlatıp çıkıyor. Bu servisin ne yaptığına birazdan geleceğiz.

Dosyanın kaynaklar kısmından fidye yazılımını(örnekte `tasksche.exe`) çıkartıp çalıştıran kısım ise şurası:

```
int FidyeCikar()
{
  HMODULE hModul;
  HRSRC v3; 
  HGLOBAL v5; 
  DWORD v6; 
  HANDLE hFile; 
  int v9, v10, v11, v12, v13, v14; 
  char DosyaAdi[MAX_PATH]; 
  CHAR NewFileName[MAX_PATH]; 

  hModul = GetModuleHandleW(&ModuleName);
  if ( hModul )
  {
    // Kullanılacak olan fonksiyonların adreslerini çalışma zamanında çöz
    IslemOlustur = GetProcAddress(hModul, a_CreateProcessA);
    DosyaOlustur = GetProcAddress(hModul, aCreatefilea);
    DosyayaYaz = GetProcAddress(hModul, aWritefile);
    TutamakKapat = GetProcAddress(hModul, aClosehandle);;
    if ( IslemOlustur )
    {
      if ( DosyaOlustur )
      {
        if ( DosyayaYaz )
        {
        	// Type = "R" olan kaynağı bul
            v3 = FindResourceA(0, 0x727, Type);
            if ( v3 )
            {
              v5 = LoadResource(0, v3);
              if ( v5 )
              {
              	// Kaynağın içeriğini dön bize
                v9 = LockResource(v5);
                if ( v9 )
                {
                  v6 = SizeofResource(0, v3);
                  if ( v6 )
                  {
                  	// "C:/Windows/tasksche.exe"
                    sprintf(&DosyaAdi, aCSS, aWindows, aTasksche_exe);
                    // "C:/Windows/qeriuwjhrf"
                    sprintf(&NewFileName, aCSQeriuwjhrf, aWindows);
                    MoveFileExA(&DosyaAdi, &NewFileName, 1u);
                    hFile = DosyaOlustur(&DosyaAdi, 0x40000000, 0, 0, 2, 4, 0);
                    if ( hFile != -1 )
                    {
                      DosyayaYaz(hFile, v9, v6, &v9, 0);
                      TutamakKapat(hFile);
                      strcat(&DosyaAdi, "/i");
                      // "C:/Windows/tasksche.exe /i"
                      if ( IslemOlustur(0, &DosyaAdi, 0, 0, 0, 0x8000000, 0, 0, &v14, &v10) )
                      {
                        TutamakKapat(v11);
                        TutamakKapat(v10);
      //
      // Kapatılan süslü parantezler
      //

  return 0;
}
```

Bu aşamadan itibaren fidye yazılımı(örnekte `tasksche.exe`) çalışmaya başlıyor. Çalıştığında ne yapıyor derseniz yine çalışan dosyanın kaynakların kısmında bulunan şifreli bir zip dosyasını içerisinden çıkarıyor (şifre `WNcry@2ol7`). Bu dosyanın içerisinde fidye yazılımının kullandığı araç gereçler var. Örneğin kullanıcıya gösterilecek mesaj (28 dilde), bitcoin ile ilgili şeyler, tor adresleri, masaüstü arkaplan resmi, şifrelenmiş dosyaların bulunduğı yerlere bırakılan mesaj gibi. Bunun dışında zararlının kullanacağı kayıt defteri girdilerini ekliyor, iki adet alt işlem çalıştırıyor dosya izinlerini ve görünürlüğünü değiştirmek için (*icacls* ve *attrib* işlemleri), kullanacağı birkaç fonksiyonun adresini çözüyor, `t.wnry` isimli şifrelenmiş dosyayı çözerek bunun içerisinde saklanan DLL'i çıkartıp, o DLL'de dışa aktarılan `TaskStart` fonksiyonu çağırıyor. Böylece işlem o DLL'den devam ediyor.

Yukarıda bahsi geçen işlemlerin yapıldığı kısım şöyle : 

```
    KayitDefteriSeyleriniOlustur(1);
    ZipCikart(0, ZipSifresi);
    TorAdresiniIsle();
    IslemOlustur(attrib, 0, 0);
    IslemOlustur(aIcacls_GrantEv, 0, 0);
    if ( KullanilanFonksiyonAdresleriniAl() )
    {
      sub_4012FD(&a);
      if ( sub_401437(&a, 0, 0, 0) )
      {
        v6 = t_wncoz(&a, "t.wnry", &v15);
        if ( v6 )
        {
          dllTutamak = load_dll(v6, v15);
          if ( dllTutamak )
          {
            TaskStart = DllFonksiyonAdresiBul(dllTutamak, TaskStart);
            if ( TaskStart )
              TaskStart(0, 0);
          }
        }
      }
    ...
    ...
```

Bu şifresi çözülüp içerisinden TaskStart fonksiyonu çağırılan DLL ise esas şifreleme fonksiyonlarını içeren DLL. İlk çalıştırıldığında benim örneğimde `MsWinZonesCacheCounterMutexA0` isimli bir muteks'in sistemde var **olmaması** durumunda çalışıyor. Aşırı paranoyak iseniz arka tarafa çalışan tek görevi bu muteksi oluşturup beklemeye geçen minik bir programcık yazıp bu zararlının dosyalarınızı şifrelemesini **sanırım şimdilik** engelleyebilirsiniz hehehe. DLL bunun dışında yine zararlının kendi içerisinden çıkarttığı iki adet yazılım çalıştırıyor (`taskdl.exe` ve `taskse.exe`). Bunlardan biri geçici dosyaları silerken diğeri meşhur "*Zaaaaa dosyalarınızı şifreledik çözmek için şunları şunları yapın*" diyen diğer bir yazılımı (`@wanadecryptor@.exe`) çalıştırıyor. Son olarak DLL'in dosyaları şifrelemekte kullanılan esas araç olduğunu söylememize gerek yok... 

Solucana geri dönersek dediğimiz gibi bu arkadaş bir süre önce sızmış olan NSA sömürgeçlerini kullanarak yayılıyordu. Ve yukarıda kendisini servis olarak eklediğini de görmüştük. İşte bu servisin başlangıç fonksiyonu bulaşma rutinlerinin de başladığı yer. Bu sayede zararlı sürekli olarak başka sistemlere bulaşma işlemini gerçekleştirebiliyor.

```
int BulastiriyomAbi()
{
  int sonuc; 
  HANDLE handle1; 
  HANDLE handle2; 
  signed int sayac; 

  sonuc = Ilkle();
  if ( sonuc )
  {
    handle1 = beginthreadex(0, 0, IcAgdaBulas, 0, 0, 0);
    if ( handle1 )
      CloseHandle(handle1);
    sayac = 0;
    do
    {
      handle2 = beginthreadex(0, 0, DislaraAcil, v2, 0, 0);
      if ( handle2 )
        CloseHandle(handle2);
      Sleep(2000u);
      ++sayac;
    }
    while ( sayac < 128 );
    sonuc = 0;
  }
  return sonuc;
}
```

`Ilkle` isimli fonksiyon ağ işlemleri ve şifreleme fonksiyonları için ilkleme fonksiyonlarını çağırıyor. Sonrasında ise biri x64 diğeri x86 için iki adet DLL oluşturuyor. -Bu DLL'ler ise solucanın kendisini çalıştıran küçük çalıştırılabilir dosyalar. Çalıştıklarında kendi kaynaklarında sakladıkları solucanı çıkartıp çalıştırıyorlar- Sonrasında ise gördüğünüz gibi iki adet işlemcik(thread) oluşturuyor. Bunlardan biri iç ağa bulaşmaya çalışırken diğeri ise dış ağda bulaşmaya çalışıyor. İç ağ ile ilgili olan `GetAdaptersInfo` ve `GetPerAdapterInfo` fonksiyonlarını kullanıp iç ağdaki ip adreslerini tespit ediyor sonrasında kendi içerisinde bir işlemcik daha oluşturuyor. Bu işlemcik ise bahsi geçen ip adresinde öncelikle **445** portunun açık olma durumunu kontrol ediyor. Eğer açık ise *MS17-010* zafiyetini sömürecek olan kodu çalıştırmaya başlıyor. 

Dış ağ ile ilgili olanda ise rastgele ip adresleri üretilerek bu ip adreslerine bağlantı kurulmaya çalışılıyor. Eğer bu adreslerin **445** portu açık ise, aynen iç ağda olduğu gibi *MS17-010* zafiyeti sömürülerek oraya da bulaşma sağlanıyor. Bu arada sanıyorum sadece **ETERNALBLUE** değil aynı zamanda **DOUBLEPULSAR** isimli arkadaş da burada devreye giriyor. Lakin sanıyorum NSA bu SMB zafiyetini kullanıp sistemlere bir de arka kapı yerleştirmiş(hala daha yapıyor belki - **DOUBLEPULSAR**). Bu arkadaşa birtakım sihirli sözler söylediğiniz zaman sizlere yetkili kapılar açılıyor. Bu solucan da bunu kullanmış doğal olarak. Bunun için yukarıda bahsi geçen sihirli sözler zararlı yazılım tarafından şu anda kontrol edilen ip adresine gönderiliyor. Eğer karşı sistemde **DOUBLEPULSAR** var ise, o bu sihirli sözcükleri yakalayıp saldırganın isteklerini yerine getiriyor. Eğer sistemde **DOUBLEPULSAR** yoksa, bu defa *MS17-010* zafiyetini kullanarak(**ETERNALBLUE**) sisteme zararlı yazılımı bulaştırma işlemini yapıyor. 

İşin kısa özeti bu şekilde. Aslına bakarsanız kullanılan sömürgeçler dışında çok da ahım şahım bir şey yoktu bu devam eden saldırıda. Ama işte kullanılan sömürgeçler olayı bir anda başka bir boyuta taşıdı. 

Lafı açılmışken bu sömürgeç arkadaşın da incelemesini bir sonraki yazıda yapabilirim ama öncesinde sözü verilmiş başka bir yazı daha var ve ondan da daha önce artık gitmeliyim yoksa otobüsü kaçıracağım...

Sevgi ve selamlar.  
