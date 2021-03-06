var alintilar = [
      'Biz sizi yakın bir azap ile uyardık. Bir gündedir ki o, kişi kendi ellerinin önden gönderdiğine bakar ve küfre sapan şöyle der: "Keşke toprak olsaydım!". (<i>Nebe, 40</i>)',
      'Oh be! Ölünce ne kadar rahatladım! (<i>Meraklı Köfteci</i>)',
      'İnsana <b>düşünmemeyi</b> telkin eden her şey, şeytan vesvesesidir. (<i>Mâtürîdî</i>)',
      'Vicdanı olan, hatasının da bilincindeyse, varsın acı çeksin. (<i>Fyodor Dostoyevski</i>)',
      'Deniz sakin olduğu zaman dümeni herkes tutar. (<i>Publilius Syrus</i>)',
      'Türkiye’de her 4 kişiden biri depresyonda. 2013 yılında yaklaşık 50 milyon kutu antidepresan kullandık. Bu büyük bir felakettir. Çoğumuzun umudu, enerjisi, neşesi yok. Zafer peşinde koşmak, birilerini alt etmek; gönül zenginliği ve ferahlığı getirmiyor. Sonuç ortada: 50 milyon kutu antidepresanı ben mi içtim? (<i>Murat Menteş</i>)',
      'Evren; hakikati arama peşinde koşmayanlardan kendisini gizler. (<i>Andrey Tarkovsky</i>)',
      'Nasiplendirildiğiniz şeyler şu iğreti hayatın yararından ve süsünden ibarettir. Allah\'ın katındaki ise daha hayırlı ve daha süreklidir. Hâlâ aklınızı işletmeyecek misiniz? (<i>Kasas, 60</i>)',
      'Keçide de sakal var. (<i>Atasözü</i>)',
      'Hür-mecbur, sorumlu-sorumsuz, önünde sonunda huzursuzdur. Tarihsiz, ümitsiz ve içgüdüye tâbi varlıklar, başkasının mutluluğu ya da mutsuzluğu onu ilgilendirmediği için mi mutludurlar? (<i>Yümni Sezen</i>)',
      'Çağdaşlık bugün acaba aklın artışı mıdır, yoksa nefsin artışı mıdır? (<i>Yümni Sezen</i>)',
      'Türk toplumunun önemli bir kısmı, gelenekle çağdaşlık arasında bocalayıp duruyor. Şahsiyet bozukluğundan, ahlâki zaaf ve çelişkilerden başka henüz bir şey elde edememiştir. (<i>Yümni Sezen</i>)',
      'İki şeyin eksikliği göze çarpıyor ve hızla yok oluyor: İlke ve Ülkü. Fert ve toplumlarda ilkesizlik ve ülküsüzlük, fertleri hüsrana, toplumu kargaşaya veya hayvan topluluklarına yaklaşmaya doğru götürecektir. (<i>Yümni Sezen</i>)',
      'Şikayet etmeyi gereksiz bulacak kadar bu meselelerden uzaklaşmışsanız, yapacak bir şey yoktur. (<i>Yümni Sezen</i>)',
      'Kapitalizm, küreselleşme ile evrensel kültüre gidilmesini istiyor. Hâkimiyeti kolaylaştırmak için robotlaşmış insanlara ihtiyaç vardır. (<i>Yümni Sezen</i>)',
      'Güçlü olan borusunu öttürür diyebilirsiniz ama yine de alay etmez üzülürsünüz. (<i>Yümni Sezen</i>)',
      'Beyine ait kölelik, beden köleliğinden çok daha kötüdür. Çünkü farkına varacak organın işleyişi köleleşmiştir. (<i>Yümni Sezen</i>)',
      'Bizim yapacağımız şudur: Kuran\'ı önümüze koyar, dikkatle okuruz. İnsandan istediklerini dikkatle not ederiz. Sonra dönüp dünyaya bakarız: Hangi toplum bu değerlerin daha fazlasını hayatına sokmuşsa onun İslam\'dan nasibinin daha çok olduğuna hükmederiz. Bunu yaptığımızda karşımıza çıkacak olan tablo, gerçekten ürpertici olacaktır. Ama unutmayalım ki Kur\'an\'ı ciddiye almanın ilk adımı işte bunu yapmaktır. Çünkü akla kara, aldatanla aldanan, uyuyanla yürüyen ancak o ciddi işin yapılmasından sonra ortaya çıkar... (<i>Yaşar Nuri Öztürk - İslam Nasıl Yozlaştırıldı</i>)',
      'İnsan kendisi söz konusu olduğunda kördür. (<i>Michel Foucault</i>)',
      'Ölçüde ve tartıda hile yapanların vay hâline! (<i>Mutaffifin, 1</i>)',
      'Akletmek Müslümanlar tarafından terk edildi ve bu yüzden zelil bir hale düştüler. (<i>İbn-i Haldun</i>)',
      'Bilmek, anlamak değildir. (<i>Muhammed İkbal</i>)',
      'Adaletsizliği bir yangından daha çabuk önlemeliyiz. (<i>Herakleitos</i>)',
      'Kur\'an ve İslam sadece hocalara bırakılmayacak kadar önemlidir. (<i>Aliya İzzetbegoviç</i>)',
      'Bakınız arkadaşlar, ben belki çok yaşamam. Fakat siz, ölene dek Türk gençliğini yetiştirecek ve Türkçe’nin bir kültür dili olarak gelişmeye devamı yolunda çalışacaksınız. Çünkü Türkiye ve Türklük, uygarlığa ancak bu yolla kavuşabilir. (<i>Mustafa Kemal Atatürk</i>)',
      'Ağacın kurdu içinde olur. (<i>Atasözü</i>)',
      'Size, düşünecek kimsenin düşünebileceği kadar bir ömür vermedik mi? (<i>Fatır, 37</i>)',
      'Batı dillerinden hiçbirinden aşağı olmamak üzere, onlardaki kavramları anlatacak keskinliği, açıklığı haiz Türk bilim dili terimleri tespit edilecektir. (<i>Mustafa Kemal Atatürk</i>)',
      'Koyma akıl, akıl olmaz. (<i>Atasözü</i>)',
      'Bu toplum ağır bir uykuya dalmış! Neler olup bittiğinden nasıl haberleri olsun? O sadece kendini düşünür, akıllıdır! Mutluluk uyuşturmuş onu. Metronun gelmesinden başka beklediği hiçbir şey yok! (<i>Ali Şeriati</i>)',
      'Zamanın ters, sohbetin faydasız, herkesin bezgin ve her başın bir ağrı taşıdığını görünce, evime kapanıp haysiyetimi korudum. (<i>Fârâbî</i>)',
      'Türkiye\'de millî eğitim ne millîdir, ne de eğitimdir. (<i>Oktay Sinanoğlu</i>)',
      'İnsan mezardan dönemez ama hatadan dönebilir. (<i>Aleksandr Soljenitsin</i>)',
      'Kaynanam iyi ulan! (<i>Gardırop Fuat</i>)',
      'Sonradan ilahi adalet diye adaleti göklere çıkardılar ki, yeryüzünde ondan söz edilmesin. (<i>Ali Şeriati</i>)',
      'Demokrasi insanları sayar, hâlbuki onları tartmak gerekir. (<i>Ludwig Wittgenstein</i>)',
      'Sinema sapık sanatın ta kendisidir. size arzuladığınız şeyi vermez, nasıl arzulayacağınızı söyler. (<i>Slavoj Zizek</i>)',
      'Elbet bizim de fikrimizin sorulacağı gün gelecek. (<i>Yoksul</i>)',
      'Afferin ulan Şakir! Hiç kimse Gardırop Fuat\'ın gardırobunu araklayamadı ha! Helal olsun. (<i>Sakar Şakir</i>)',
      'Şuursuz alışkanlık gaflete yakınlık ve yatkınlık doğurur. (<i>Yümni Sezen</i>)',
      'Gmail başından beri kitlesel bir istihbarat toplama sistemi olarak sadece Gmail kullanıcıların değil aynı zamanda Gmail kullanıcılarına e-posta gönderen kişilerin de ruh-bilimsel sınıflandırmasını yapmak için planlanmıştı. (<i>Richard Stallman</i>)',
      'Gök çatlayıp yarıldığı zaman (...) Benlik, bilmiş olacaktır önden gönderdiğini de arkaya bıraktığını da. (<i>İnfitar 1,5</i>)',
      'Gerçek şu ki, insan için çalışıp didindiğinden başkası yoktur. (<i>Necm, 39</i>)',
      'Allah odur ki, gökleri ve yeri yarattı. Yörüngelerinde hiç durmadan yürüyen Güneş\'i ve Ay\'ı da size boyun eğdirdi. Geceyi ve gündüzü de hizmetinize verdi. Allah\'ın nimetini saymaya kalksanız bitiremezsiniz. Doğrusu şu ki insan, gerçekten çok zalim, çok nankördür. (<i>İbrahim, 32, 33, 34</i>)',
      'Su misali boşa akan ömrün, faturası kabarık olur. (<i>Emre Dorman</i>)',
      'Allah\'ı, zalimlerin yapmakta olduğundan habersiz sanma. O, onların hesabını gözlerin donup kalacağı bir güne erteliyor! (<i>İbrahim, 42</i>)',
      'Hakikat yücedir ve mutlaka egemen olacaktır. (<i>Latince Deyiş</i>)',
      'Doktor, sen önce kendini iyileştir. (<i>Latince Deyiş</i>)',
      'Hayvanlar bilim yapmaz. (<i>Yümni Sezen</i>)',
      'Dindar bir toplumu ancak din adına, din alimleri kandırabilirdi ve öyle de oldu. (<i>Ali Şeriati</i>)',
      'Siz gerçeği bilmek değil kandırılmak istiyorsunuz. (<i>Prestij Filminden</i>)',
      'Bencillik, öğrenilen bir davranış biçimidir; daha doğrusu, insanın yaşarken yakalandığı bir hastalıktır. \"İnsan, insanın kurdudur.\" diyen, iktisadı \" sınırsız istekleri olan insanın, sınırlı kaynaklarla nasıl geçineceğini öğreten bilim \" olarak tanımlayan, avı ve avcıyı aynı sofraya oturtan bir zihnin insanlara bulaştırdığı bir hastalık. (<i>Şaban Ali Düzgün</i>)',
      'Ey insan! O sonsuz cömertliğin sahibi Kerîm Rabbine karşı seni aldatıp gururlu kılan nedir?! (<i>İnfitar, 6</i>)',
      'Bugün talebelik, artık ilim yolculuğu değil, diploma avcılığıdır. (<i>Nurettin Topçu</i>)',
      'Altı üstü beş metrelik bez için boşa geçmiş ömre yaşam denir mi? (<i>Barış Manço</i>)',
      'O güç yetmez büyük felaket geldiğinde, o gün insan, neyin uğrunda çaba harcadığını anlar. (<i>Naziat, 34-35</i>)',
      'Nerede olursak olalım ilim ana yurdumuzdur, bilgisizlik yabancı bir yer. (<i>İbn Rüşd</i>)',
      'Hiç kimse görmek istemeyen kadar kör değildir. (<i>İbn-i Sina</i>)',
      'Okul, toplumu bu haliyle kabullenmeniz için çalışan bir reklam ajansıdır. (<i>Ivan Illich</i>)',
      'Hiçbir şey bilmeyen cahildir, ama bilip de susan ahlaksızdır. (<i>Bertolt Brecht</i>)',
      'İnandığını söylediğin şeyi yapmadığın sürece ona inanıp inanmadığını bilemezsin. (<i>Tolstoy</i>)',
      'Bırak onları(gerçeği görmezlikten gelenleri) yesinler, nimetlenip zevk etsinler ve sonu gelmez arzu kendilerini oyalasın. Ama yakında bilecekler. (<i>Hicr, 3</i>)',
      'Kalbi temiz olmayan, hiçbir şeyi derinden anlayamaz. (<i>Dostoyevski</i>)',
      'Güç olan ölümden kaçınmak değil, kötülükten kaçınmaktır. (<i>Sokrates</i>)',
      'Bir kitap bir aynadır. Ona bir maymun bakacak olursa karşısında elbette bir evliya görmez. (<i>G.C. Lichtenberg</i>)',
      'Bütün gerçekler üç aşamadan geçerek sınanır. Önce komik bulunur, sonra şiddetli bir direnişle karşılaşır ve üçüncü aşamada kesin doğru olarak kabul edilir. (<i>Arthur Schopenhauer</i>)',
      'Körler ülkesinde \'görmek\' bir hastalık sayılır. (<i>Cenap Şehabettin</i>)',
      'Okumadığı kitaba inandığını söyleyen, yalan söylüyordur. (<i>Cengiz Yardım</i>)',
      'Doğrular devam eder, yanlışlar çekip gider veya tahribata devam eder, olup-bitenin bir kısmı unutulur, bazılarının üzerinden ise ip atlanır gibi atlanıp geçilir. (<i>Yümni Sezen</i>)',
      'Fakat ahlâkın izmihlali ne müthiş bir izmihlal, ne millet kurtulur zira ne milliyet ne istiklâl. (<i>Akif Ersoy</i>)',
      'Ey iman edenler! Öz benliğiniz, anne-babanız, yakınlarınız aleyhine de olsa, zengin veya fakir de olsalar, adaleti dimdik ayakta tutarak Allah için tanıklık edenler olun. (<i>Nisa, 135</i>)',
      'Gerçek din, ilan ettiğimiz inancımız değil, sürdürdüğümüz hayattır. (<i>Sezai Karakoç</i>)',
      'Ölüm yaşam uykusundan uyanmaktır. (<i>Barış Manço</i>)',
      'Bir amaca bağlanmayan ruh, yolunu kaybeder. Çünkü her yerde olmak, hiçbir yerde olmamaktır. (<i>Montaigne</i>)',
      'Bugün, evet sadece bugün otuz bin çocuk açlıktan ölecek. Yarın diğer bir otuz bin. Bu ilginç değil, ancak futbol ilginç... (<i>Patch Adams</i>)',
      'Bir çiçeği yaratabilmek için bütün kâinatı yaratmak gerekir. (<i>Saadettin Merdin</i>)',
      'Suçlamak, anlamaktan daha kolaydır. Anlarsan, değişmen gerekir. (<i>Peyami Safa</i>)',
      'Ve giderek bütün gençleri saran bir gırgır furyası, bir gevezelik, malayanilik, bir seviyesizlik... (<i>Cahit Zarifoğlu</i>)',
      'Yağmurlu bir Pazar günü öğleden sonra ne yapacaklarını bilmeyen milyonlar, bir de ölümsüzlük isterler. (<i>Susan Ertz</i>)',
      'Dupduru bakan ve dürüst konuşan her şeyi seviyorum. (<i>Nietzsche</i>)',
      'Düşüncenin gözü, gözler keskinliğini kaybettiğinde iyi görmeye başlar. (<i>Sokrates ya da belki Platon</i>)',
      'Doğru felsefe yapanlar kendilerini ölüme hazırlar. (<i>Alexander Nehamas</i>)',
      'Hayatınız bir işe yaramayıp boşu boşuna geçtiyse, onu yitirmekten ne korkuyorsunuz? Daha yaşayıp da ne yapacaksınız? (<i>Montaigne</i>)',
      'Hayatı anlamayanlar ölümü hatırlamayı arzu etmezler. Çünkü bu hatırlama onlara, yaşadıkları hayatın aklî vicdana uygun düşmediğini gösterir. (<i>Tolstoy</i>)',
      'Ölüm daima gözünün önünde olsun. O zaman asla âdî endişelere düşmezsin ve maddi hiçbir şeyi hırsla arzu etmezsin. (<i>Epiktetos</i>)',
      'Bugün yapılması gerekeni yarına bırakan, her vakit yıkımlarla karşılaşır. (<i>Epiktetos</i>)',
      'Mezardakilerin pişman olduğu şeyler için, dünyadakiler birbirini yiyor. (<i>Goethe</i>)',
      'Herkes insanlığı değiştirmeyi düşünür, ama hiç kimse önce kendini değiştirmeyi düşünmez. (<i>Tolstoy</i>)',
      'Kindar insan, kudurmuş bir boğa gibi, önüne çıkan hiçbir şeyi görmeyerek, bir duvara toslayana kadar koşar. (<i>Dostoyevski</i>)',
      'Neden buradayız bilmiyorum, ama eğlenmemiz için olmadığı kesin. (<i>Ludwig Wittgenstein</i>)',
      'Tüketicilik, insanın sürekli olarak kendi ömründen harcadığı taksitli bir hayat. Geçmişteki tüketimi karşılamak için daima geleceği satmak. Madem ki satın alma gücüm yok, madem ki zorunlu olarak bazı şeylere muhtaç kılındım ve madem ki param yoktur, öyleyse ömrümün kalan yıllarını satayım. İşte modern kölelik ve işte kölelerin özgürlüğü. (<i>Ali Şeriati</i>)',
      'En azından üstün bir zihnin varlığını düşünmemiz için, bir neden oluşturmak üzere, ne olması ya da ne olmuş olması gerekir? (<i>Antony Flew</i>)',
      'Kader hak ettiğimiz yerde olmaktır. İnsanlar ya hak ettikleri yerdedirler ya da oraya varacaklardır. (<i>Şaban Ali Düzgün</i>)',
      'Herkesin istediğini yaptığı yerde hiç kimse istediğini yapamaz; efendinin olmadığı yerde herkes efendidir; herkesin efendi olduğu yerde herkes köledir. (<i>Şaban Ali Düzgün</i>)',
      'Yanıyorum ama beni yakanı da yakıcam! Sizi de yakıcam! Mahalleyi de yakıcam! Hepinizi yakıcam ulan inekler!! (<i>Gardırop Fuat</i>)',
      'Bugünün dünyası, hayatında ihtiyaç duyduğu aleti yapmak için hayatını durdurmuştur. (<i>Ali Şeriati</i>)',
      'Yeni neslin bilimsel, teknik ve düşünsel kazanımlarla donatılması dışında hiçbir parlak başarısı yoktur. (<i>Ali Şeriati</i>)',
      'Düşüncede dinsizlik, davranışta her şeyi mübah görmekle eş anlamlıdır. (<i>Ali Şeriati</i>)',
      'Amacı, sorumluluğu ve derdi olmayan kişi, başını bağlamak için meşguliyetler peşinde koşacaktır. (<i>Ali Şeriati</i>)',
      'İradesini başka birinin iradesine teslim eden insanın, bu insanlığını kaybedişini hiçbir şey telafi edemez. (<i>Şaban Ali Düzgün</i>)',
      'Bir doyum ve iyimserlik maskesinin ardındaki çağdaş insan, aslında sonra derece mutsuzdur. Hatta umutsuzluğun eşiğindedir. (<i>Şaban Ali Düzgün</i>)',
      'İnsanın üstünlüğü, insanın her şeyi başarabilme gücüne sahip olmasının kendisine verdiği gurur ve bu gücün sonluluğunun getirdiği alçak gönüllülük arasındaki dengeyi sağlamasında yatar. (<i>Şaban Ali Düzgün</i>)',
      'Tohumu ıslahta, fazla ürün almakta, ticaret ve sanayii iyi düzenlemekte, eğitimde, bütün bilimsellikleri yerine getirmişiz, sonra uzman geçinenlerin fantezilerini uygulamak kalmıştır. Çünkü bu daha kolaydır. Zahmet gerektirmez. Öbürü ciddi ve yorucu işlerdir. Bunun gibi zevk de vermez. (<i>Yümni Sezen</i>)',
      'Kapitalizm mi, spor mu? Bu çağda bu soru abestir. (<i>Yümni Sezen</i>)',
      'Hiç de fena insanlar değillerdi. Yalnız boş, bomboş mahlûklardı. Yaptıkları münasebetsizlikler hep buradan geliyordu. İçlerinin esneyen boşluğu karşısında ancak başka başka insanları istihfaf ve tahkir etmek, onlara gülmek suretiyle kendilerini tatmin edebiliyorlar, şahsiyetlerinin farkına varıyorlardı. (<i>Sabahattin Ali</i>)',
      'Gül solup, mevsim geçince, artık bülbülden maceralar işitemezsin. (<i>Celaleddin Rumi</i>)',
      'İçinde bir miktar para olan cüzdanını kaybettiğin zaman buna tepkisiz kalamazsın; öyleyse dürüstlüğünü, iyiliğini ve tevazuunu yitirdiğini neden hissetmiyorsun? (<i>Epiktetos</i>)',
      'Hakikati bulmanın verdiği özgüven bir yana, hakikati aramak bile insana huzur verir. (<i>Blaise Pascal</i>)',
      'Hakikatin kendisini değiştireceğinden korkan bir insan için, bundan daha büyük bir talihsizlik yoktur. (<i>Blaise Pascal</i>)',
      'Hakikat arayışı eğlence ile değil, kaygı ve endişe ile yapılır. Buna rağmen hakikati aramalısın, çünkü onu bulmadan ve onu sevmeden, ancak mahvolursun. (<i>Blaise Pascal</i>)',
      'İnsanlar kendilerini bir taraftan bir tarafa atarak haz peşine düşerler, çünkü hayatlarında bir boşluk hissediyorlar. Ancak onların hissedemediği bir boşluk daha vardır ki, kendilerini cezbeden o hazzın içindeki tatminsizliktir. (<i>Blaise Pascal</i>)',
      'Bilmekten değil, yanlış bilmekten korkmalısın, çünkü bu butün kötülüklerin kaynağıdır. (<i>Tolstoy</i>)',
      'İnsanlara ırklarına, çoğrafyalarına, dinlerine vs. bakarak muamele eden ötekileştirici zihin, insana karşı işlediği bu en temel suçun bedelini kenddini hiçbir yerde güvende hissetmeyerek ödemektedir. (<i>Şaban Ali Düzgün</i>)',
      'İnsanların yapıp ettiklerini eleştirmek ama kendileri hakkında hüküm vermemek. Bu, birlikte iyi bir yaşamı inşa etmenin esaslı formülüdür. (<i>Şaban Ali Düzgün</i>)',
      'Susuzluğumuzu dindirmek istiyorsak, susuzluğu açıklayan kitapları bir kenara bırakalım da bir yudum su içelim. (<i>J. Bowker</i>)',
      'Bârika-i hakikat, müsâdeme-i efkârdan çıkar. (<i> Unutulmuş Bir Deyiş</i>)',
      'İnsanın aklı çoğaldıkça can sıkıntısı artar. (<i>Dostoyevski</i>)',
      'İzlemek cehennemden daha yakıcıdır! (<i>İran Atasözü</i>)',
      'Açlık, bana daima evin harika bir köşesinden daha faydalı olmuştur. Çünkü en kötü kombinasyon, boş bir ruh ile dolu bir midedir. (<i>Aliya İzzetbegoviç</i>)',
      'Cahil için her şey daima: \"Budur, bundan başka gerçek yoktur\" olmuştur. Zihniyetleri genellikle muhakkak, belli ve kesindir. Çünkü ömrü boyunca hiçbir zaman görüşünü yenileme durumu olmamış, kulağına yeni bir söz ulaşmamıştır. (<i>Ali Şeriati</i>)',
      'Batı\'daki akıntıya kapılarak ilerlemeye yönelik çalışmalarımız sonuçsuz kalmıştır. Bunun, Batı uygarlığını doğuran nedenleri anlamayacak ölçüde aldanmış olmamızdan ileri geldiği artık şüphesizdir. (<i>Said Halim Paşa</i>)',
      'Bir ülkenin toplumsal kurumları ihracat konusu edilebilecek mallar değillerdir. Bunların ithali ise, çoğu zaman zillete neden olacak bir davranıştır. Böyle bir girişimi öğütleyenler, toplumsal kurumların ne demek olduğunu anlamaktan ve kendi ülkelerine karşı görevlerinin neler olması gerektiğini değerlendirmekten aciz olduklarını kanıtlamış olurlar. (<i>Said Halim Paşa</i>)',
      'Bizi kendimizi bile kavramaktan alıkoyan taklit ve iktibaslarla durumumuzu düzeltmeye çalışmakla, çok acı bir toplumsal kargaşaya ve siyasal anarşiye yol açmaktan başka bir sonuç elde edemeyeceğimizden zerre kadar kuşku duymamalıyız. (<i>Said Halim Paşa</i>)',
      'Eğer bir yerde yangın varken biri seni ibadet etmeye çağırıyorsa bil ki bu bir hainin davetidir. (<i>Ali Şeriati<i>)',
      'Allah aranızdaki çalışanları ortaya çıkarmadan, sabredenleri ayırmadan cennete gireceğinizi mi sandınız? (<i>3:142</i>)',
      'Dinlemeyi öğrenirsen, kötü konuşmalardan bile faydalanabilirsin. (<i>Plutarkhos</i>)',
      'Dinlemeyen kimsenin ilmi de olmaz. (<i>Musa Carullah Bigi</i>)',
      'Andolsun ki, biz, Kur\'an\'ı öğüt ve ibret için kolaylaştırdık. Fakat düşünen mi var! (<i>Kamer, 32</i>)',
      'Hep konuşursan hiçbir şey duyamazsın. (<i>Kızılderili Sözü</i>)',
      'Ne mutlu o insana ki, kötülerin öğüdüyle yürümez, günahkârların yolunda durmaz, alaycıların arasında oturmaz. (<i>Mezmurlar, 1:1</i>)',
      'Sen ki peygamberlerini bile dinlemedin beni hiç dinlemezsin. (<i>Halil Cibran</i>)',
      'İyi insan; aklından kötülük geçirmeyen, saf insan değildir. İyi insan; her şeyin farkında olup, iyiliği tercih edendir. (<i>???</i>)',
      'Türk demek, Türkçe demektir; ne mutlu Türküm diyene. (<i>Mustafa Kemal Atatürk</i>)',
      'Düşmanı olan bir şey, var demektir, ona hiç yok diyebilir misiniz? Olmayan bir şeyin nasıl düşmanı olur? (<i>Yümni Sezen</i>)',
      'Batıdan medet uman, ahmak ve haysiyetsizdir ve kafasızdır. (<i>Oktay Sinanoğlu</i>)',
      'Bize bir Allah\'tan bir de bizden hayır gelir. (<i>Oktay Sinanoğlu</i>)',
      'Anlamsız bir hayat, tesadüfen dünyaya geliş, kıyasıya bir hayat mücadelesi, yemek, içmek, yatmak ve bir de çiftleşme! Yaratılmışların en şereflisi insana evrimcilerin layık gördüğü seviye ancak bu kadardır. (<i>Saadettin Merdin</i>)',
      'Doğuştan gelen tek bir yanılgı vardır. O da mutlu olmak için burada olduğumuzu sandığımızdır. (<i>Arthur Schopenhauer</i>)',
      'Yanlış ve yalan fikirler daima parlak gözükür. Fuhşun felsefesini yapmanın, namusun müdafaasını yapmaktan daha kolay olduğu gibi... (<i>H.N. Atsız</i>)',
      'Tadını çıkardığınız bu varlıkta hayat kadar ölümün de yeri vardır. Doğduğunuz gün bir yandan yaşamaya bir yandan ölmeye başlarsınız. (<i>Montaigne</i>)',
      'Dürüstlük, argüman ortaya koymayı gerektirir, bilinçsizce inanmayı değil. (<i>Engin Erdem</i>)',
      'Sebebi, sonucun yaratıcı nedeni sanırlar. (<i>Saadettin Merdin</i>)',
      'Çağdaş dünyamızda artık toprağa, kana, devlete, ırka, bayrağa ve şahıslara tapılıyor. (<i>Ali Şeriati</i>)',
      'Ey insanlık! Elbet sizi bir erkekle bir dişiden yaratan Biziz; derken sizi kavimler ve kabileler haline getirdik ki tanışabilesiniz. Elbet Allah katında en üstününüz, O’na karşı sorumluluk bilinci en güçlü olanınızdır; şüphe yok ki Allah her şeyi bilir, her şeyden haberdardır.(<i>Hucurât, 13</i>)',
      'Fakirlik yemeksiz geçirilen bir gece değildir. Fakirlik, düşünmeden geçirilen bir gecedir. (<i>Ali Şeriati</i>)',
      'Hepimiz soruları duymak istediğimiz cevaplara göre değiştiririz. (<i>Gregory House</i>)',
      'Bir fikir bir insanın hoşuna gitmiyorsa, o kişinin o fikir aleyhine argümanlar bulması hiç de zor olmayacaktır. (<i>Sigmund Freud</i>)',
      'Sırf tüketimle, alışveriş merkezlerinde alışveriş yapmakla zenginleşilmez. Batarsın sonunda. Önce şahıs olarak, sonra ülke olarak batarsınız. Haberiniz olsun. (<i>Oktay Sinanoğlu</i>)'
    ]
    function rastgeleGetir() {
      var rast = Math.floor(Math.random() * (alintilar.length));
      document.getElementById('site-intro').innerHTML = alintilar[rast];
    }
    window.onload = rastgeleGetir;
    window.setInterval(rastgeleGetir, 15000);
