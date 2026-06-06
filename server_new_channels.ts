// New user-requested sports streams, playlists, and update fallbacks.
// Mapped with clean names, secure branding logos, and groups.

export interface NewChannelRaw {
  name: string;
  logo: string;
  url: string;
  group: string;
}

export const USER_NEW_CHANNELS: NewChannelRaw[] = [
  {
    "name": "30A Golf Kingdom",
    "logo": "https://golfkingdom.net/wp-content/uploads/2022/04/golf-kingdom-st.jpg",
    "url": "https://30a-tv.com/feeds/vidaa/golf.m3u8",
    "group": "Sports"
  },
  {
    "name": "beIN SPORTS XTRA",
    "logo": "https://i.ibb.co/HT49GPmB/XTRA-2.png",
    "url": "https://bein-xtra-bein.amagi.tv/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "Cricket Gold",
    "logo": "https://resources.cricket-australia.pulselive.com/cricket-australia/photo/2025/07/25/836eddae-4329-4542-ad17-dcd37e9d951a/Cricket-Gold-1920x1080_noBG.png",
    "url": "https://streams2.sofast.tv/ptnr-yupptv/title-cricketgold/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/b2048bb8-1686-4432-aa50-647245383e0c/manifest.m3u8",
    "group": "Sports"
  },
  {
    "name": "DAZN Combat",
    "logo": "https://i.postimg.cc/VsW3Jsrz/logo-DAZN-Combat.png",
    "url": "https://dazn-combat-rakuten.amagi.tv/hls/amagi_hls_data_rakutenAA-dazn-combat-rakuten/CDN/master.m3u8",
    "group": "Sports"
  },
  {
    "name": "DraftKings Network",
    "logo": "https://i.imgur.com/SFYhgrt.png",
    "url": "https://na.linear.zype.com/e0bd0e23-a958-4e43-8164-4f2fef8876a8/fd3614bd-90bf-4530-a277-65ae3a1720c8-zype/live.m3u8",
    "group": "Sports"
  },
  {
    "name": "ESPN8 The Ocho",
    "logo": "https://images.fubo.tv/channel-config-ui/station-logos/on-dark/espn_8_the_ocho_bw.png",
    "url": "https://d3b6q2ou5kp8ke.cloudfront.net/ESPNTheOcho.m3u8",
    "group": "Sports"
  },
  {
    "name": "FIFA+ United States",
    "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/FIFA%2B_(2025).svg/960px-FIFA%2B_(2025).svg.png",
    "url": "https://d2w9q46ikgrcwx.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-of5cbk3sav3w5/v1/sysdata_s_p_a_fifa_7/samsungheadend_us/latest/main/hls/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "FIFA+ Women",
    "logo": "https://i.imgur.com/xy9ZxVO.png",
    "url": "https://cffda8ff.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/U2Ftc3VuZy1nYl9GSUZBUGx1c3dvbWVuX0hMUw/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "FloHockey 24/7",
    "logo": "https://images.fubo.tv/channel-config-ui/station-logos/on-dark/flohockey-white.png",
    "url": "https://amg02278-amg02278c2-flosports-worldwide-9916.playouts.now.amagi.tv/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "FloRacing 24/7",
    "logo": "https://images.fubo.tv/channel-config-ui/station-logos/on-dark/floracing-white.png",
    "url": "https://amg02278-amg02278c1-flosports-worldwide-7592.playouts.now.amagi.tv/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "Fox Sports 1",
    "logo": "https://i.imgur.com/O9BapV9.png",
    "url": "http://190.11.225.124:5000/live/fs1_hd/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "FTF Sports",
    "logo": "https://i.imgur.com/yvUjOI3.png",
    "url": "https://1657061170.rsc.cdn77.org/HLS/FTF-LINEAR.m3u8",
    "group": "Sports"
  },
  {
    "name": "FUEL TV",
    "logo": "https://i.imgur.com/I8mviBy.png",
    "url": "https://d35j504z0x2vu2.cloudfront.net/v1/master/0bc8e8376bd8417a1b6761138aa41c26c7309312/fuel-tv/playlist.m3u8?ads.vf=gbdyvfXODOK",
    "group": "Sports"
  },
  {
    "name": "fubo Sports Network",
    "logo": "https://i.imgur.com/qFNRJLb.png",
    "url": "https://dnf08l6u6uxnz.cloudfront.net/master.m3u8",
    "group": "Sports"
  },
  {
    "name": "KTV Sport",
    "logo": "https://i.imgur.com/R1hGX1d.png",
    "url": "https://kwtspta.cdn.mangomolo.com/sp/smil:sp.stream.smil/chunklist.m3u8",
    "group": "Sports"
  },
  {
    "name": "MotorTrend FAST TV",
    "logo": "https://us1-prod-images.disco-api.com/2020/7/13/4f26aaf2-a993-480d-9675-0d501fb8d86f.png?bf=0&f=png&p=true&q=85&w=250",
    "url": "https://live-manifest.production-public.tubi.io/live/e7be5ad5-9044-4151-95d4-a9aae10ab0a5/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "NBC Sports NOW",
    "logo": "https://i.imgur.com/EzNf2Yx.png",
    "url": "https://d4whmvwm0rdvi.cloudfront.net/10007/99993008/hls/master.m3u8?ads.xumo_channelId=99993008",
    "group": "Sports"
  },
  {
    "name": "Oman Sports TV",
    "logo": "https://i.imgur.com/1omi7p8.png",
    "url": "https://partneta.cdn.mgmlcdn.com/omsport/smil:omsport.stream.smil/chunklist.m3u8",
    "group": "Sports"
  },
  {
    "name": "PGA Tour",
    "logo": "https://i.imgur.com/J0TY9dG.png",
    "url": "https://d11k1mnrgfposz.cloudfront.net/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "Red Bull TV",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Red_Bull_TV.png",
    "url": "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
    "group": "Sports"
  },
  {
    "name": "Sky Racing 1",
    "logo": "https://i.imgur.com/Hf0EiaW.png",
    "url": "https://636ffd31f0e12.streamlock.net/RacingStream1/RacingStream1/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "Sky Racing 2",
    "logo": "https://i.imgur.com/TxQvFnQ.png",
    "url": "https://636ffd31f0e12.streamlock.net/RacingStream2/RacingStream2/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "Sony Sports Ten 1",
    "logo": "https://xstreamcp-assets-msp.streamready.in/assets/LIVETV/LIVECHANNEL/LIVETV_LIVETVCHANNEL_SONY_SPORTS_TEN_1/images/LOGO_HD/image.png",
    "url": "https://sl.vodep39240327.workers.dev/channel/SONY%20TEN%201.m3u8",
    "group": "Sports"
  },
  {
    "name": "Sony Sports Ten 2",
    "logo": "https://xstreamcp-assets-msp.streamready.in/assets/LIVETV/LIVECHANNEL/LIVETV_LIVETVCHANNEL_SONY_SPORTS_TEN_2/images/LOGO_HD/image.png",
    "url": "https://sl.vodep39240327.workers.dev/channel/SONY%20TEN%202.m3u8",
    "group": "Sports"
  },
  {
    "name": "Sports Connect",
    "logo": "https://i.imgur.com/0sNWg54.png",
    "url": "https://streamdot.broadpeak.io/cff02a74da64d1459391ce1f72d58f1a/afxpstr/SportsConnect/index.m3u8",
    "group": "Sports"
  },
  {
    "name": "Star Sports 1 HD",
    "logo": "https://i.imgur.com/E5jjKHI.png",
    "url": "http://103.253.18.58:8000/play/a00m",
    "group": "Sports"
  },
  {
    "name": "Swerve Sports",
    "logo": "https://i.imgur.com/GT0Yi2T.png",
    "url": "https://linear-253.frequency.stream/mt/roku/253/hls/master/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "Trace Sport Stars",
    "logo": "https://i.imgur.com/FabFP5A.png",
    "url": "https://lightning-tracesport-samsungau.amagi.tv/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "TSN The Ocho",
    "logo": "https://tvpnlogopus.samsungcloud.tv/platform/image/sourcelogo/vc/00/02/34/CA1400003R3_20240709T002034SQUARE.png",
    "url": "https://d3pnbvng3bx2nj.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-rds8g35qfqrnv/TSN_The_Ocho.m3u8",
    "group": "Sports"
  },
  {
    "name": "TVS Boxing",
    "logo": "https://i.imgur.com/30ZoF75.png",
    "url": "https://rpn.bozztv.com/gusa/gusa-tvsboxing/index.m3u8",
    "group": "Sports"
  },
  {
    "name": "TVS Classic Sports",
    "logo": "https://i.imgur.com/auR0Mi6.png",
    "url": "https://rpn.bozztv.com/gusa/gusa-tvs/index.m3u8",
    "group": "Sports"
  },
  {
    "name": "TVS Sports",
    "logo": "https://i.imgur.com/Lwwq62E.png",
    "url": "https://rpn.bozztv.com/gusa/gusa-tvssports/index.m3u8",
    "group": "Sports"
  },
  {
    "name": "TVS Sports Bureau",
    "logo": "https://i.imgur.com/Lwwq62E.png",
    "url": "https://rpn.bozztv.com/gusa/gusa-tvssportsbureau/index.m3u8",
    "group": "Sports"
  },
  {
    "name": "TVS Turbo",
    "logo": "https://i.imgur.com/7zYIbU1.png",
    "url": "https://rpn.bozztv.com/gusa/gusa-tvsturbo/index.m3u8",
    "group": "Sports"
  },
  {
    "name": "TVS Women Sports",
    "logo": "https://i.imgur.com/8hC4PfF.png",
    "url": "https://rpn.bozztv.com/gusa/gusa-tvswsn/index.m3u8",
    "group": "Sports"
  },
  {
    "name": "Unbeaten Sports Channel",
    "logo": "https://i.imgur.com/LmkNt3v.png",
    "url": "https://d1t5afz6qed3xk.cloudfront.net/Unbeaten.m3u8",
    "group": "Sports"
  },
  {
    "name": "VSiN",
    "logo": "https://i.imgur.com/C4wIRxg.png",
    "url": "https://vsin-sgrewind.streamguys1.com/scte/live-2k/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "Willow Sports",
    "logo": "https://provider-static.plex.tv/epg/cms/production/acf3d1d8-c53e-49ca-86e9-0d9410b106b4/Willow_Sports_dark_Background_1500_1000_color.png",
    "url": "https://d36r8jifhgsk5j.cloudfront.net/Willow_TV.m3u8",
    "group": "Sports"
  },
  {
    "name": "Women's Sports Network",
    "logo": "https://i.imgur.com/rhIwUcQ.png",
    "url": "https://d39accvx65hq9o.cloudfront.net/Womens_Sports_Network.m3u8",
    "group": "Sports"
  },
  {
    "name": "World Billiards TV",
    "logo": "https://images-3.rakuten.tv/storage/global-live-channel/translation/artwork/80af06f2-a12e-4406-bd13-b932fd69fffe-width200-quality90.png",
    "url": "https://9a81dd4ee3884d0dbcacafaf0d81327a.mediatailor.us-east-1.amazonaws.com/v1/master/04fd913bb278d8775298c26fdca9d9841f37601f/RakutenTV-eu_BilliardsTV/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "T Sports HD (10)",
    "logo": "https://raw.githubusercontent.com/abusaeeidx/T-Sports-Playlist-Auto-Update/refs/heads/main/images/images%20(6)%20(9).jpeg",
    "url": "https://tvsen7.aynaott.com/tsports-hd/index.m3u8?e=1780674732&u=78be6644-0a65-48ec-81a4-089ac65a2619&token=e9530971ff48efc7637a7e88bb537f92",
    "group": "Sports"
  },
  {
    "name": "PTV Sports HD (پاکستان)",
    "logo": "https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/PTV-Sports.png",
    "url": "https://tvsen5.aynaott.com/PtvSports/tracks-v1a1/mono.ts.m3u8",
    "group": "Sports"
  },
  {
    "name": "DD Sports 2.0 (ভারত)",
    "logo": "https://raw.githubusercontent.com/abusaeeidx/Tv-Channel-Logo/refs/heads/main/DD-Sports.png",
    "url": "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8",
    "group": "Sports"
  },
  {
    "name": "Willow HD (যুক্তরাষ্ট্র - ক্রিকেট)",
    "logo": "https://stream.crichd.tv/assets/uploads/channels/55.png",
    "url": "https://tvsen5.aynaott.com/willowhd/index.m3u8",
    "group": "Sports"
  },
  {
    "name": "Willow Extra Live (Cricket US)",
    "logo": "https://stream.crichd.tv/assets/uploads/channels/55.png",
    "url": "http://27.124.71.27/Willow_Extra/index.m3u8",
    "group": "Sports"
  },
  {
    "name": "Sports Range",
    "logo": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop",
    "url": "https://nomawnoijl.gpcdn.net/akash/sportrange/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "Flash Guys HD",
    "logo": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=120&auto=format&fit=crop",
    "url": "https://nomawnoijl.gpcdn.net/akash/flashguys/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "Crazy Ex",
    "logo": "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=120&auto=format&fit=crop",
    "url": "https://nomawnoijl.gpcdn.net/akash/crazy_ex/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "Thunder Er",
    "logo": "https://images.unsplash.com/photo-1540747737956-37872404453a?w=120&auto=format&fit=crop",
    "url": "https://nomawnoijl.gpcdn.net/akash/thunder/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "Fighters",
    "logo": "https://images.unsplash.com/photo-1517438476312-12d799797207?w=120&auto=format&fit=crop",
    "url": "https://nomawnoijl.gpcdn.net/akash/fighter/playlist.m3u8",
    "group": "Sports"
  },
  {
    "name": "Redbull TV (এক্সট্রিম স্পোর্টস)",
    "logo": "https://jiotvimages.cdn.jio.com/dare_images/images/Red_Bull_TV.png",
    "url": "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master_3360.m3u8",
    "group": "Sports"
  },
  {
    "name": "Motor Vision (মোটরস্পোর্টস)",
    "logo": "https://logos-download.com/wp-content/uploads/2021/01/Motorvision_TV_Logo.png",
    "url": "https://mvg-mv-xumo.otteravision.com/mvg/mv/mv.m3u8",
    "group": "Sports"
  },
  {
    "name": "A SPOR (তুরস্ক - ফুটবল)",
    "logo": "https://upload.wikimedia.org/wikipedia/commons/e/ee/A_Spor_logo.png",
    "url": "https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/aspor/aspor_480p.m3u8",
    "group": "Sports"
  },
  {
    "name": "Real Madrid TV (ফুটবল)",
    "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Real_Madrid_TV_Logo.svg/512px-Real_Madrid_TV_Logo.svg.png",
    "url": "https://rmtv.akamaized.net/hls/live/2043153/rmtv-es-web/bitrate_3.m3u8",
    "group": "Sports"
  },
  {
    "name": "Football World Cup 2026 / Live Sports",
    "logo": "https://carboncredits.com/wp-content/uploads/2025/09/shutterstock_2306088965-e1757112807302.jpg",
    "url": "https://tvsen7.aynaott.com/sspts1/tracks-v1a1/mono.ts.m3u8",
    "group": "Sports"
  }
];
