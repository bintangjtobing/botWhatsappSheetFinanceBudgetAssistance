function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const pesan = data.message?.toLowerCase();
  const nomor = data.from;
  const nama = data.name;

  const sheetId = "1Y7koxt0WSm50ZEQNof0V9eJoR_u34RV-yDpU1W5TqJQ"; //Ganti dengan ID SPREADSHEET
  const ss = SpreadsheetApp.openById(sheetId);

  // Ambil sheet untuk setup WA dan validasi nomor
  const WAsheet = ss.getSheetByName("SETUP WA");
  const nomorDiSheet = WAsheet.getRange("C7:C")
    .getValues()
    .flat()
    .filter((n) => n);

  if (!nomorDiSheet.includes(nomor.trim())) {
    kirimPesan(
      nomor,
      "Halo!👋\n\nAku *BotBudgetFinance*.\nInput Catatan Keuangan dengan mudah dari sini dan akan tersimpan langsung ke sheet langsung."
    );
    return ContentService.createTextOutput("UNAUTHORIZED");
  }

  // Ambil sheet untuk mencatat pesan masuk
  const sheet = ss.getSheetByName("PESAN WA MASUK");

  //DASHBOARD
  const dashboardSheet = ss.getSheetByName("📊 DASHBOARD");

  const kategoriPemasukan = dashboardSheet
    .getRange("B25:B32")
    .getValues()
    .flat()
    .filter(String);
  const kategoriKebutuhan = dashboardSheet
    .getRange("F25:F32")
    .getValues()
    .flat()
    .filter(String);
  const kategoriKeinginan = dashboardSheet
    .getRange("J25:J32")
    .getValues()
    .flat()
    .filter(String);
  const daftarSumberDana = dashboardSheet
    .getRange("N25:N49")
    .getValues()
    .flat()
    .filter(String);

  const totalSaldo = dashboardSheet.getRange("P24").getValue();
  const daftarAset = dashboardSheet.getRange("N25:N49").getValues().flat();
  const saldoAset = dashboardSheet.getRange("P25:P49").getValues().flat();

  //ASET
  const asetSheet = ss.getSheetByName("💰 ASET");

  // Ambil data dari sheet ASET mulai baris ke-7
  const tanggalTransaksi = asetSheet.getRange("I7:I").getValues().flat();
  const nominalTransaksi = asetSheet
    .getRange("J7:J")
    .getValues()
    .flat()
    .map(Math.abs);
  const keteranganTransaksi = asetSheet.getRange("K7:K").getValues().flat();
  const kategoriTransaksi = asetSheet.getRange("L7:L").getValues().flat();
  const asalAsetTransaksi = asetSheet.getRange("M7:M").getValues().flat();

  // Ambil data dari sheet Dashboard
  const totalPemasukan = dashboardSheet.getRange("D24").getValue();

  const persentaseKebutuhan = dashboardSheet.getRange("K34").getValue();
  const targetKebutuhan = dashboardSheet.getRange("K35").getValue();
  const realisasiKebutuhan = dashboardSheet.getRange("K36").getValue();

  const persentaseKeinginan = dashboardSheet.getRange("K40").getValue();
  const targetKeinginan = dashboardSheet.getRange("K41").getValue();
  const realisasiKeinginan = dashboardSheet.getRange("K42").getValue();

  const persentaseMenabung = dashboardSheet.getRange("K46").getValue();
  const targetMenabung = dashboardSheet.getRange("K47").getValue();
  const realisasiMenabung = dashboardSheet.getRange("K48").getValue();

  const today = new Date();
  const formattedDate = Utilities.formatDate(
    today,
    Session.getTimeZone(),
    "d MMMM yyyy"
  );

  const tanggal = new Date();
  const row = [tanggal, nomor, nama, pesan];
  sheet.appendRow(row);
  const rowIndex = sheet.getLastRow();

  // TAMBAHAN: Deteksi ucapan terima kasih dan respon pendek
  const ucapanPattern =
    /^(makasih|terima\s*kasih|thank\s*you|thanks|thx|tq|ok(e|ay)?|oke|sip|baik|mantap|mantul|siap|nuhun|matur\s*nuwun|matur\s*suwun|hatur\s*nuhun|trims)$/i;

  if (ucapanPattern.test(pesan.trim())) {
    const balasanUcapan = getRandomResponse();
    sheet.getRange(`E${rowIndex}`).setValue(balasanUcapan);
    kirimPesan(nomor, balasanUcapan);
    return ContentService.createTextOutput("OK");
  }

  let prompt = "";
  if (pesan.includes("saldo")) {
    let rincianSaldo = daftarAset
      .map((aset, i) => {
        if (!aset) return null;
        const nominal = saldoAset[i] || 0;
        return `- ${aset}: Rp${Number(nominal).toLocaleString("id-ID")}`;
      })
      .filter(Boolean)
      .join("\n");

    prompt = `Kamu adalah asisten keuangan pribadi user. Tampilkan ringkasan saldo berikut:

💰 *Total Saldo Saat Ini:* Rp${Number(totalSaldo).toLocaleString("id-ID")}

📂 *Rincian Saldo per Aset:*
${rincianSaldo}

Berikan jawaban dengan gaya ramah, jelas, dan jangan tambahkan data yang tidak disebutkan. Jika user tidak menyebutkan secara spesifik, tuliskan semua saja daftar rincian saldo per asetnya. Namun, jika user hanya menyebutkan dan itu ada di databse, kirimkan. Kalau tidak ada, jangan improvisasi menambahkan sendiri. Misalnya, kalau user hanya ingin mengecek saldo Mandiri, ya tampilkan saldo mandiri. Kalau misalnya mau ngecek Shoppepay, tampilkan shopeepay. Kalau tidak ada, bilang tidak ada. Jangan gunakan saya anda. Gunakan aku kamu`;
  } else if (pesan.includes("mutasi")) {
    prompt = `Kamu adalah asisten keuangan cerdas.

Tugasmu di sini menampilkan mutasi sesuai yang diinginkan user, yaitu "${pesan}". Pertama, analisislah dulu jawaban seperti apa yang diharapkan user. Apakah ia ingin mengecek mutasi doang, mengecek mutasi dari periode tertentu, hari tertentu. Jika dari pesan tersebut tidak menampilkan keterangan waktu. Berikan mutasi transaksi 7 hari ke belakang mulai dari hari ini tanggal ${formattedDate}. Namuuun, jika ada keterangan waktunya, ya tampilkan mutasi sesuai waktu yang dipilih oleh user hasil analisismu. Misalnya user minta mutasi 10 hari ke belakang, ya berikan atau tampilkan mutasi 10 hari ke belakang. Jika user minta mutasi tanggal 1-10 APril 2025, berikan mutasi tanggal tersebut. Oiya, untuk datanya pastikan sesuai dan apa yang kamu tampilkan sesuai dengan tanggalnya ya. Gunakan bahasa yang santai, informatif, jelas, gunakan aku kamu, jangan saya anda. Kemudian outputnya langsung saja, misalnya berikut adalah mutasi keuanganmu dan seterusnya. Tidak perlu pakai pembuka Saya akan menampilkan mutasi sesuai permintaan Anda. 

Ambil data mutasi dari ${asetSheet}.
Gunakan data dari kolom berikut:
- Tanggal: ${tanggalTransaksi}
- Nominal: ${nominalTransaksi}
- Keterangan: ${keteranganTransaksi}
- Kategori: ${kategoriTransaksi}
- Aset: ${asalAsetTransaksi}

Perhatikan:
- Nominal positif berarti pemasukan, negatif berarti pengeluaran.
- Urutkan data dari tanggal terbaru ke yang paling lama.
- Tampilkan maksimal sesuai rentang hari yang diminta.

Format output per transaksi seperti ini:
📥/**📤** *[Keterangan]*  
📅 *Tanggal:* [Tanggal transaksi]  
💵 *Nominal:* Rp[Nominal]  
🏦 *Aset:* [Aset]

Contoh output:
📤 *Beli kopi*  
📅 *Tanggal:* 8 April 2025  
💵 *Nominal:* Rp18.000  
🏦 *Aset:* BCA

Sekarang buatkan mutasi keuangan user berdasarkan data yang sudah kamu urutkan, pastikan tanggal, transaksi, nominal, dan aset benar. Jangan kamu ubah-ubah sendiri.`;
  } else if (pesan.includes("alokasi")) {
    prompt = `Sebagai asisten keuangan, jawab pertanyaan tentang alokasi user ini: "${pesan}". Tampilkan alokasi dana bulan ini berdasarkan data dari Google Sheets. Buatlah dengan nada bicara yang santai, informatif. Kamu boleh beri apresiasi jika realisasi kebutuhan dan keinginan belum sama dengan dana maksimal dan tabungan sudah mencapai target. Namun, jika kebutuhan dan pengeluaran membengkak, beri masukan tapi jangan terkesan menggurui. Pakai aku kamu, jangan saya Anda. Tidak perlu pakai pengantar misalnya oke kita lihat alokasi danamu bulan ini. Langsung saja misalnya Alokasi Dana. Kamu menggunakan pembagian dst. Untuk persentase pastikan dalam bentuk persen misalnya 50:30:20. Jangan desimal.

📊 *Total Pemasukan:* Rp ${totalPemasukan.toLocaleString("id-ID")}

📌 *Alokasi Kebutuhan:* ${persentaseKebutuhan}% (Maksimal: Rp ${targetKebutuhan.toLocaleString(
      "id-ID"
    )})
📉 *Realisasi:* Rp ${realisasiKebutuhan.toLocaleString("id-ID")}

📌 *Alokasi Keinginan:* ${persentaseKeinginan}% (Maksimal: Rp ${targetKeinginan.toLocaleString(
      "id-ID"
    )})
📉 *Realisasi:* Rp ${realisasiKeinginan.toLocaleString("id-ID")}

📌 *Alokasi Menabung:* ${persentaseMenabung}% (Target: Rp ${targetMenabung.toLocaleString(
      "id-ID"
    )})
📉 *Realisasi:* Rp ${realisasiMenabung.toLocaleString("id-ID")}

Tampilan akhir bisa dijelaskan seperti:
🧾 *Alokasi dana* 

Kamu menggunakan pembagian *${persentaseKebutuhan}:${persentaseKeinginan}:${persentaseMenabung}* untuk kebutuhan, keinginan, dan tabungan dari total pemasukan. 
Ini adalah alokasi danamu

📊 *Total Pemasukan:* Rp ${totalPemasukan.toLocaleString("id-ID")}

📌 *Alokasi Kebutuhan:* ${persentaseKebutuhan}% (Maksimal: Rp ${targetKebutuhan.toLocaleString(
      "id-ID"
    )})
📉 *Realisasi:* Rp ${realisasiKebutuhan.toLocaleString("id-ID")}

📌 *Alokasi Keinginan:* ${persentaseKeinginan}% (Maksimal: Rp ${targetKeinginan.toLocaleString(
      "id-ID"
    )})
📉 *Realisasi:* Rp ${realisasiKeinginan.toLocaleString("id-ID")}

📌 *Alokasi Menabung:* ${persentaseMenabung}% (Target: Rp ${targetMenabung.toLocaleString(
      "id-ID"
    )})
📉 *Realisasi:* Rp ${realisasiMenabung.toLocaleString("id-ID")}

Sekecil apapun prosesnya, kamu tetap keren! Semangat!
`;
  } else {
    const analisaPrompt = `Tentukan apakah pesan berikut adalah catatan transaksi keuangan:\n"${pesan}"\n\nJika iya, jawab hanya dengan "YA. ITU CATATAN TRANSAKSI". Jika tidak, jawab hanya dengan "BUKAN"`;
    const hasilAnalisis = callGeminiAPI(analisaPrompt);
    if (hasilAnalisis.toLowerCase().includes("ya")) {
      prompt = `Bertindaklah sebagai analis keuangan pribadi yang cerdas. Analisislah pesan transaksi berikut dan kategorikan berdasarkan daftar kategori yang telah disediakan. Ekstrak juga informasi nominal (angka) dan sumber dana (jika disebutkan) dari daftar sumber dana yang tersedia. Jika sumber dana tidak ditemukan dalam daftar atau tidak disebutkan, gunakan "Kas". 

**Tanggal:** Jika ada informasi waktu, sesuaikan dengan tanggal hari ini. Tanggal hari ini ${formattedDate}. Jika tidak ada, pakai saja tanggal hari ini.

**Kategori Pemasukan:**
${kategoriPemasukan.map((cat) => "- " + cat).join("\n")}

**Kategori Pengeluaran (Kebutuhan):**
${kategoriKebutuhan.map((cat) => "- " + cat).join("\n")}

**Kategori Pengeluaran (Keinginan):**
${kategoriKeinginan.map((cat) => "- " + cat).join("\n")}

**Daftar Sumber Dana/Aset yang Diketahui:**
${daftarSumberDana.map((sumber) => "- " + sumber).join("\n")}

**Pesan Transaksi:** "${pesan}"

**Berikan output dalam format berikut:**

"Berikut adalah analisis kategori transaksi yang Anda berikan:
* **Tanggal:** [Tanggal transaksi, jika tidak ada keterangan waktu, pakai hari ini]
* **Jenis:** [Pemasukan/Pengeluaran]
* **Keterangan:** [Keterangan untuk belanja/pemasukan dari mana - misalnya beli cilok, gaji Maret]
* **Kategori:** [Pilih salah satu kategori dari daftar di atas yang paling sesuai dengan pesan transaksi. Khusus pemasukan ada kategori 💸 Tarik Tunai. Kategori ini untuk tarik tunai artinya ya digunakan untuk mengambil cash dari aset yang lain atau pindah aset dari aset satu ke cash (biasanya dari bank, tapi tidak menutup kemungkinan dari yang lain)]
* **Kategori Pengeluaran:** [hanya ada tiga,🎭 Keinginan, 🏠 Kebutuhan, dan 💳 Menabung, jangan tambah-tambahi. Penejelasannya seperti ini 🎭 Keinginan (sifatnya tidak mendesak, sebenarnya bisa ditunda), 🏠 Kebutuhan(kebutuhan  sehari-hari), 💳 Menabung (menabung ini banyak jenisnya bisa ketika user bilang menabung atau investasi. Jangan sampai salah mengategorikan Menabung dengan Pindah Aset ya. Khusus pengeluaran saja.]
* **Sumber Dana:** [Ekstrak dari pesan atau default ke Kas]
* **Dana Tujuan:** [Hanya jika relevan]
* **Nominal:** [Ekstrak angka nominal dari pesan transaksi. Pastikan hanya angka yang disertakan]"`;

      simpanHasilAnalisisKeTransaksi(ss);
    } else {
      const defaultRespon =
        "Halo! 👋\nAku *BotBudgetFinance* 🤖\nSiap bantu kamu mencatat keuanganmu! 💰\n\nTapi *aku enggak nemu data transaksi* dari pesan kamu barusan 😕\n\nAku bisa mengecek:\n- *Saldo*, asal ada saldo di chatmu, kukirim info saldomu.  \n- *Mutasi*, secara default 7 hari, kalau kamu kasi keterangan waktu, kubantu cek mutasi periode waktu yang kamu beri. \n- *Alokasi Dana*, biar ngatur duitmu lebih oke, kubantu cek alokasi dana milikmu, ya!\n- *Input transaksi*.\n\nContoh format yang bisa kuproses untuk catatan keuangan kayak gini:\n📝 *hari ini aku makan seblak habis 10 ribu tf BCA*\n\nKalau kamu *tidak menyebutkan aset*, aku akan anggap transaksinya dari *Kas*.\n\nYuk coba lagi~ 😉";
      sheet.getRange(`E${rowIndex}`).setValue(defaultRespon);
      kirimPesan(nomor, defaultRespon);
      return ContentService.createTextOutput("OK");
    }
  }

  const responGemini = callGeminiAPI(prompt);
  sheet.getRange(`E${rowIndex}`).setValue(responGemini);

  // setelah tulis respon
  simpanHasilAnalisisKeTransaksi(ss);

  // cek apakah sudah diproses sebagai transaksi
  const status = sheet.getRange(`F${rowIndex}`).getValue();
  if (status !== "✅ Sudah diproses") {
    kirimPesan(nomor, responGemini);
  }
  return ContentService.createTextOutput("OK");
}

// Fungsi baru: Mendapatkan respons acak untuk ucapan terima kasih
function getRandomResponse() {
  const responses = [
    "Sama-sama! 😊 Senang bisa membantu kamu mengatur keuangan~",
    "Siap! 👍 Ada yang bisa kubantu lagi?",
    "Oke! 😉 Jangan ragu hubungi aku kalau butuh bantuan lagi ya!",
    "Dengan senang hati! 🌟 Aku selalu siap membantu kapanpun kamu butuh.",
    "Sip! 🙌 Semoga keuanganmu makin teratur ya!",
    "No problem! 👌 Aku ada di sini kapanpun kamu butuh.",
    "Tentu! 😎 Itulah gunanya BotBudgetFinance.",
    "Ok! 🤖 Tetap semangat mengelola keuanganmu ya!",
    "Sama-sama kak! 🌈 Ada lagi yang bisa kubantu?",
    "Sukses selalu untuk keuanganmu! 💪",
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

// FUNGSI YANG DISINKRONKAN DARI SCRIPT KEDUA:
function simpanHasilAnalisisKeTransaksi(ss) {
  const sheet = ss.getSheetByName("PESAN WA MASUK");
  const pemasukanSheet = ss.getSheetByName("📥 PEMASUKAN");
  const pengeluaranSheet = ss.getSheetByName("📤 PENGELUARAN");
  const dashboardSheet = ss.getSheetByName("📊 DASHBOARD");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const hasilAnalisis = data[i][4];
    const status = data[i][5];
    const nomorWA = data[i][1];
    const pushName = data[i][2];

    if (status === "✅ Sudah diproses") continue;
    if (
      !hasilAnalisis ||
      hasilAnalisis.includes("aku enggak nemu data transaksi")
    )
      continue;

    const jenisMatch = hasilAnalisis.match(/\* \*\*Jenis:\*\* (.*)/);
    const kategoriMatch = hasilAnalisis.match(/\* \*\*Kategori:\*\* (.*)/);
    const sumberMatch = hasilAnalisis.match(/\* \*\*Sumber Dana:\*\* (.*)/);
    const nominalMatch = hasilAnalisis.match(/\* \*\*Nominal:\*\* (.*)/);
    const tanggalMatch = hasilAnalisis.match(/\* \*\*Tanggal:\*\* (.*)/);
    const keteranganMatch = hasilAnalisis.match(/\* \*\*Keterangan:\*\* (.*)/);
    const jenisPengeluaranMatch = hasilAnalisis.match(
      /\* \*\*Kategori Pengeluaran:\*\* (.*)/
    );
    const danaTujuanMatch = hasilAnalisis.match(/\* \*\*Dana Tujuan:\*\* (.*)/);

    if (
      !jenisMatch ||
      !kategoriMatch ||
      !sumberMatch ||
      !nominalMatch ||
      !tanggalMatch ||
      !keteranganMatch
    )
      continue;

    const jenisFull = jenisMatch[1].trim().toLowerCase();
    const jenis = jenisFull.includes("pemasukan")
      ? "pemasukan"
      : jenisFull.includes("pengeluaran")
      ? "pengeluaran"
      : null;
    if (!jenis) continue;

    const kategori = kategoriMatch[1].trim();
    const sumber = sumberMatch[1].trim();
    const nominal = parseFloat(nominalMatch[1].replace(/[^\d]/g, ""));
    const tanggal = tanggalMatch[1].trim();
    const keterangan = keteranganMatch[1].trim();
    const danaTujuan = danaTujuanMatch ? danaTujuanMatch[1].trim() : "";

    if (jenis === "pemasukan") {
      const masukKe = kategori === "💸 Tarik Tunai" ? danaTujuan : sumber;
      const sumberDana = kategori === "💸 Tarik Tunai" ? sumber : "";

      // Tambahkan baris ke Sheet PEMASUKAN
      pemasukanSheet.appendRow([
        "",
        tanggal,
        nominal,
        keterangan,
        kategori,
        masukKe,
        sumberDana,
      ]);

      // Ambil saldo terbaru dari dashboard (misalnya untuk aset masuk)
      const saldoTerbaru = dashboardSheet.getRange("P24").getValue();

      // Kirim WhatsApp dengan format yang sesuai
      if (kategori === "💸 Tarik Tunai") {
        kirimWhatsapp({
          pushName: pushName,
          number: nomorWA,
          jenis: "Pemasukan",
          kategori: kategori,
          tanggal: tanggal,
          keterangan: keterangan,
          nominal: nominal,
          masukKe: masukKe, // aset tujuan: misalnya "Cash"
          sumber: sumber, // aset asal: misalnya "Rekening BCA"
        });
      } else {
        kirimWhatsapp({
          pushName: pushName,
          number: nomorWA,
          jenis: "Pemasukan",
          kategori: kategori,
          tanggal: tanggal,
          keterangan: keterangan,
          nominal: nominal,
          aset: masukKe,
          saldo: saldoTerbaru,
        });
      }
    } else if (jenis === "pengeluaran") {
      const jenisPengeluaran = jenisPengeluaranMatch
        ? jenisPengeluaranMatch[1].trim()
        : "";
      const danaTujuanFinal =
        jenisPengeluaran === "💳 Menabung" ? danaTujuan : "";
      const kategoriPengeluaran =
        jenisPengeluaran === "💳 Menabung" ? "" : kategori;

      pengeluaranSheet.appendRow([
        "",
        tanggal,
        nominal,
        keterangan,
        jenisPengeluaran,
        kategoriPengeluaran,
        sumber,
        danaTujuanFinal,
      ]);

      const saldoTerbaru = dashboardSheet.getRange("P24").getValue();

      if (jenisPengeluaran === "💳 Menabung") {
        // Format khusus untuk menabung
        kirimWhatsapp({
          pushName: pushName,
          number: nomorWA,
          jenis: "Pengeluaran",
          kategori: "💳 Menabung",
          tanggal: tanggal,
          keterangan: keterangan,
          nominal: nominal,
          masukKe: danaTujuan, // Aset Tujuan, misalnya "Rekening BCA"
          sumber: sumber, // Aset Asal, misalnya "Cash"
        });
      } else {
        // Format default
        kirimWhatsapp({
          pushName: pushName,
          number: nomorWA,
          jenis: "Pengeluaran",
          kategori: kategori,
          tanggal: tanggal,
          keterangan: keterangan,
          nominal: nominal,
          aset: sumber,
          saldo: saldoTerbaru,
        });
      }
    }
    sheet.getRange(i + 1, 6).setValue("✅ Sudah diproses");
  }
}

function kirimPesan(nomor, pesan) {
  const payload = {
    api_key: "fMea7un1dCvpdBYERdUXXYWDVcnSyVgP", //ganti dengan API KEY WAGATEWAY
    sender: "6287873157838", //ganti dengan nomor WA yang didaftarkan di WAGATEWAY
    number: nomor,
    message: pesan + "\n\n> _BotBudgetingFinance by BintangDev",
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
  };

  UrlFetchApp.fetch("https://futurewa.site/send-message", options);
}

function kirimWhatsapp(data) {
  let message;

  // Format khusus: Tarik Tunai atau Menabung
  if (data.kategori === "💸 Tarik Tunai" || data.kategori === "💳 Menabung") {
    message = `Halo, ${data.pushName}! 👋\nCatatanmu berhasil disimpan ✅\n\n${
      data.jenis === "Pemasukan" ? "📥" : "📤"
    } *${data.keterangan}*\n📅 *Tanggal:* ${
      data.tanggal
    }\n💵 *Nominal:* Rp${Number(data.nominal).toLocaleString(
      "id-ID"
    )}\n➡️ *Aset Tujuan:* ${data.masukKe}\n🏦 *Aset Asal:* ${data.sumber}`;
  } else {
    // Format default
    message = `Halo, ${data.pushName}! 👋\nCatatanmu berhasil disimpan ✅\n\n${
      data.jenis === "Pemasukan" ? "📥" : "📤"
    } *${data.keterangan}*\n📅 *Tanggal:* ${
      data.tanggal
    }\n💵 *Nominal:* Rp${Number(data.nominal).toLocaleString(
      "id-ID"
    )}\n🏦 *Aset:* ${data.aset}\n\n💰 *Saldo Terbaru:* Rp${Number(
      data.saldo
    ).toLocaleString("id-ID")}`;
  }

  const payload = {
    api_key: "fMea7un1dCvpdBYERdUXXYWDVcnSyVgP", //isi dengan API KEY WAGATEWAY
    sender: "6287873157838", //isi dengan nomor WA yang didaftarkan di WAGATEWAY
    number: data.number,
    message: message + "\n\n> _BotBudgetingFinance by BintangDev",
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
  };
  UrlFetchApp.fetch("https://futurewa.site/send-message", options);
}

function callGeminiAPI(prompt) {
  const API_KEY = "AIzaSyCnvOliN0beLl-qRm3ZNKC0F8TUaSRmKRQ"; //ganti dengan APIKEY GEMINI
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    return (
      result.candidates?.[0]?.content?.parts?.[0]?.text ||
      "❌ Maaf, tidak ada respon dari Gemini."
    );
  } catch (err) {
    Logger.log("Error callGeminiAPI: " + err);
    return "❌ Terjadi kesalahan saat menghubungi Gemini.";
  }
}
