---
layout: post
title: Debugging'e Giriş
categories: Bilgisayar
---

Merhaba, bir süredir elimin yanması nedeniyle devam edemediğim tersine mühendislk yazılarına ellerimin açılması ile fırsat buldum sonunda. Bu yazıda hata ayıklamaya (debugging) giriş yapacağız. Debugging yapmak için önünüzde birçok alternatif program var. Bunlardan en çok bilineni önceki yazıdan hatırlayacağınız üzere OllyDbg ve Immunity debugger. Ben yazılarda Immunity debugger kullanacağım. Zaten ikisinin arasında kullanım açısından pek fark yok. Siz size uygun olanı seçebilirsiniz. Öncelikle kullanacağımız programı biraz tanımakta fayda var. Genel itibariyle şöyle bir görünüme sahip.

![](/files/debug13.png)

Resimde gördüğünüz üzere bazı bölümlere numaralar verdim. Bunlardan **1** numaralı olan alan kaynak kodunun disassmbly edilmiş halidir. Bu alan da kendi içinde kolonlara ayrılıyor. İlk kolonda her bir instruction'ın gerçekleştiği bellek adresi görünmekte. İkinci kolonda ise `opcode` denilen makine kodunu görüyoruz. Son kolonda bahsettiğimiz disassembly edilmiş kodların bulunduğu kısım.

**2** numaralı alana geçtiğimizde Yazmaçların (registers) durumlarını görmekteyiz. Bu alanı da kendi içerisinde 3'e ayırıyoruz.

![](/files/debug2.png)

*Yazmaçlar* kısmında yazmaçların durumunu görüyoruz. Instruction ilerlettiğimizde eğer renklerinde bir değişim oluyorsa (siyah->kırmızı) bu o yazmaçın değerinin değiştiğini gösteriyor. Yazmaçların üzerine çift tıklayarak değerlerinde oynama yapabiliyoruz.

*Bayraklar* (flags) bölümünde ise dallanmalarda vs. sıkça haşır neşir olacağımız bayrakların durumlarını görüyoruz. Çoğu işlem bu bayraklara bakılarak yapılıyor. Burada da değerde değişme olursa rengimiz siyahtan kırmızıya dönüşüyor, ve yine çift tıklayarak değeri 1'den 0'a veya 0'dan 1'e alabiliyoruz.

Son kısımda *FPU* (Floating Point Unit) yazmaçları için. Tersine mühendislikte nadiren kullanılıyor daha çok şifreleme ile uğraştığınızda karşınıza çıkacak.

İlk resmimizden devam edelim. **3**. bölüme baktığımızda burası bizim **Yığın**(stack) bölümümüz. Burada geçici veri depolama bölümü olan stack'in içeriğini görebiliyoruz. Burada adres işaretçilerini, stringleri ve belkide en önemlisi çağırılan bir fonksiyondan geri dönmek için gereken geri dönüş kodları da bulunuyor. Bunlar ileride programın akışını değiştirmek için sıkça kullanacağımız dostlarımız.

Son olarak **4**. bölüm ise hex dump alanı. Burada programın hex halini görmekteyiz. İki basit kolon var burada biri Hex dump diğeride Ascii bölümüdür.

## CrackMe #1
Şimdi basit bir *CrackMe* uygulaması üzerinde daha iyi kavramaya çalışalım konuyu öncelikle aşağıdan hafif türkçeleştirilmiş gereken programı indiriyoruz.

<a href="/files/KirBeni.rar">KırBeni#1</a>

İndirdikten sonra programı, çalıştırıp kısaca bir bakalım ne oluyor ne bitiyor diye, çift tıklayıp programı çalıştırdığımızda bize lisansın geçersiz olduğunu söyleyip kendini kapatıyor, pek bir bilgi elde edemiyoruz ama basitçe düşününce hiç bir serial girmeden bunu söylediğine göre bu program bir yerlere bakındı değil mi ? Bir dosyaya olabilir mesela, peki ama bu dosyanın ismi ne ? İşte buna cevap bulabilmek için düşüyoruz yollara... Pardon, başlıyoruz debugginge.

Programı Immunity'de açtıktan sonra, bize yansıyan mesajı görüyoruz. 

![](/files/debug3.png)

Hemen mesajın üzerindeki bölümde **CreateFileA** fonksiyonu kullanılarak bir takım işlemler gerçekleşmiş, ardından bir **CMP** ve **JNZ** görmekteyiz. Buradaki kilit nokta **CreateFileA** fonksiyonu, burada bir dosyanın var olup olmadığı denetleniyor. `CMP EAX, -1` ile *EAX*'deki değerin **-1** olup olmadığına bakılıyor, -1 olması durumunda dosya yok demektir(genel kültür). **EAX** *-1* olduğu sürece *ZeroFlag* tanımlanmış(1) durumda olacağından **JNZ**( Jump if not zero(z=0)) ile dallanma gerçekleşmeyecek ve bize gösterilen mesaj atlanmayıp, gösterilecek. Yani burayı atlamak için ZeroFlag'e çift tıklayıp **0** yaparsanız, bize gösterilen mesajı atlayabilirsiniz. Ama biz bunu yapmayağız, çünkü amacımız patch yapmak değil.  Şimdi buradan anladık ki program CreateFileA fonksiyonu ile bir dosyanın varlığını kontrol ediyor. Parametrelerden görüyoruz ki ismi `Keyfile.dat` olacak. Şimdi programın bulunduğu dizinde bu isimde bir dosya oluşturup tekrar çalıştıralım.

![](/files/debug4.png)

Bu defa lisans dosyamızın doğru olmadığını söylüyor. Demek ki doğru yoldayız. Programı tekrar debuggerda açarak neler dönüp bittiğine bir göz atalım. Önceki alanda olanları gözle görmek için `CMP EAX, -1` in üzerine tıklayıp **F2** tuşuna basarak buraya bir breakpoint koyuyoruz, bu sayede programı çalıştırdığımızda buraya geldiğinde çalışması duraksayacak. **F9** Tuşuna basarak programı çalıştırıyoruz. Kesilme noktasında durduktan sonra bir kere **F8** tuşuna basarak sonraki koda geçiyoruz ve gözümüzü bayrakların bulunduğu kısma çeviriyoruz, bakın neler oldu.

![](/files/debug5.png)

*ZeroFlag* **0** olmuş, bu sayede **JNZ** devreye girmiş ve belirtilen yere bir dallanma gerçekleşmiş. Tekrar **F8** yaparak ilerlemeye devam ediyoruz ve asıl kilit nokta olan yere ulaşmış bulunuyoruz. Burayı nasıl açıklarım diye epey düşündüm. En son şöyle renklendirmeli bir şey yaptım. Ama sanırım bu tür yazılarda sıfırdan birşeyler anlatmak gerçekten çok zor çünkü geniş bir bilgiye ihtiyaç var, sonuçta ben burda tek tek assembly komutlarını, sayı sistemlerini anlatamam. Bu nedenle sanırım biraz temel bilgi şart. Neyse konumuza dönelim.

![](/files/debug6.png)

Resimde bazı yerleri renklendirilmiş görüyorsunuz. Öncelikle beyaz renkli kısımda gördüğünüz üzere **ReadFile** fonksiyonu ile Lisans dosyamız okunuyor, içerisindeki lisans bilgilerini görmek için. Dosyanın var olduğu anlaşıldıktan sonra yeşil kısımda gördüğünüz iki **XOR** ile *EBX* ve *ESI* yazmaçlarının değerleri sıfırlanıyor. Ardından pembe kısımda bir karşılaştırma (**CMP**) görüyoruz, hex. *10* ile *[402173]* adresinde bulunan birşeyler karşılaştırılıyor. Öncelikle unutmayın ki burada işlemler hexdecimal sisteme göre oluyor *hexdecimal* sistemde **10** *decimal* sistemde **16** anlamını taşıyor. Hemen ardından bir **JL** (Küçükse dallan) gelmekte. Yani *402173* adresindeki değer 16'dan küçükse bir dallanma gerçekleşiyor. Tahmin edebileceğiniz gibi bu dallanma bizi istemediğimiz bir yere **bad boy**'a götürüyor.

![](/files/debug7.png)

Şimdi basit bir mantıkla bir deneme yapalım, dosyayı açalım ve içerisine 16 tane 0 ekleyelim bakalım ne olacak ?

![](/files/debug8.png)

Bakın, bu defa dallanma gerçekleşmeyecek, bayraklardaki *S* biti **0** durumda, ve dallanmanın yanında gördüğümüz dallanılacak yeri gösteren dikey çizgimiz pasif(**gri**) durumda. Tamam, şimdi yine ilk renkli resmimize dönelim. Artık programımız koyu mavi renkli bölümden devam ediyor. Siz düşünmeden söyleyeyim, burada lisansın geçerliliği kontrol ediliyor.

Şimdi burada olay biraz karışık gibi, yani anlatması biraz zor oluyor kağıt üzerinde. Öncelikle bir resim üzerinden satır satır gidelim.

![](/files/debug9.png)

İlk satırda **AL** yazmacına *[EBX+40211A]* adresindeki değer aktarılıyor. *40211A*'yı nereden hatırlıyoruz ? Bakınız : ReadFile fonksiyonumuzun **Buffer** parametresi. Yani burada teker teker **Keyfile.dat** içerisindeki değerler *AL* yazmacına alınıyor. Ardından bir **0** ile karşılaştırma görüyoruz. Ardından artık kontrol döngüsünün içerisinde oluyoruz. Bu defa *AL* yazmacımız hex sistemde **47** ile karşılaştırılıyor. Hex sistemde **47** bildiğiniz üzere bize **G** harfini ifade ediyor. Bunları bulmak için [şuraya](http://www.ascii.cl/) bakabilirsiniz. **CMP**'den sonra bir **JNZ** gelmekte yani tekrar *Zero bayrağına* bakıyoruz. Burada eğer zero bayrağı set edilirse(**1**) dallanma gerçekleşmeyecek. Yani *Jump if not zero*. Zero 0 ise dallan. Dallanma olmadığına göre bizim lisans dosyasındaki ilk eleman **G** harfi, incelemeye devam edelim. Eğer ki dallanma olmasaydı iki adet **INC** bizi karşılayacaktı INC ile *ESI* ve *EBX*'in değeri bir arttırılacaktı, fakat dallanma olduğu için dikkat ederseniz sadece *EBX*'in değeri arttırılıyor. *ESI* **0** durumda yani burda bir sayma işlemi söz konusu, bunu teyit etmek için lisans dosyamızın ilk 0'ını silip **G** yapıyoruz ve tekrar buraya kadar programımızı çalıştırıyoruz, ardından **ESI** yazmacının değerini bi kontrol edelim.

![](/files/debug10.png)

Gördüğünüz üzere *ESI*'de arttı bu defa, peki burada görüyoruz ki döngü sürekli devam ediyor gibi, nasıl duracak bu ? Kilit nokta `CMP AL,0` karşılaştırmasından sonraki *JE*'de saklı. Yani bu döngünün bitmesi için dosyadan **16** karakterinde okunması gerek, **17**. karakter okunduğunda boş olacağı için *JE* dallanması gerçekleşecek ve bizi `CMP ESI,8` kısmına gönderecek. Yani *ESI* yazmacındaki değeri **8** ile karşılaştırıyoruz burdan anlıyoruz ki lisans dosyasında **8** adet *G* olması bizim için yeterli olacak neden mi ? Hatırlarsanız lisans dosyası kontrol edilirken *ESI* sadece **G** harfi olduğu zaman arttırılıyordu, yani *ESI* yazmacı bizim **G** harflerimizi sayıyor buradan anlıyoruz ki **8** adet *G* programı aktifleştirmek için yeterli, 8 tane G harfinden sonra **16**'ya tamamlayacak harf veya sayılar önemsiz. **CMP**'nin ardından gelen *JE* ile eğer *ESI* **8**'den küçükse tekrar **bad boy** dediğimiz lisansın geçersiz olduğu kısma atlıyoruz. Fakat bizde *8* adet *G* harfi bulunduğu için bu atlama gerçekleşmiyor ve bir sonraki satırda bulunan **JMP** ile *good boy* kısmına atlayarak programı aktifleştirmiş oluyoruz.

![](/files/debug11.png)

Ve sonunda *good boy* bizi karşılıyor.

![](/files/debug12.png)

Ne kadar anlaşılır oldu şüpheliyim, lakin anlatmak gerçekten zor çünkü çok ayrıntı var sanırım videolu anlatımlar daha uygun olacak böyle yazılar için. 

