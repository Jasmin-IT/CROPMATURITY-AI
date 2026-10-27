import 'package:flutter/material.dart';
import 'api.dart';
import 'screens.dart';
import 'ui.dart';

void main() => runApp(const AgriHarvestApp());

class AgriHarvestApp extends StatefulWidget {
  const AgriHarvestApp({super.key});
  @override
  State<AgriHarvestApp> createState() => _AgriHarvestAppState();
}

class _AgriHarvestAppState extends State<AgriHarvestApp> {
  ThemeMode mode = ThemeMode.light;
  @override
  Widget build(BuildContext context) => MaterialApp(
      title: 'Crop Maturity AI',
      debugShowCheckedModeBanner: false,
      themeMode: mode,
      theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: forest, surface: page),
          scaffoldBackgroundColor: page,
          cardColor: Colors.white,
          dividerColor: border,
          appBarTheme: const AppBarTheme(
              backgroundColor: page, foregroundColor: ink, elevation: 0)),
      darkTheme: ThemeData(
          useMaterial3: true,
          brightness: Brightness.dark,
          colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF22C55E), brightness: Brightness.dark),
          scaffoldBackgroundColor: const Color(0xFF0F1713),
          cardColor: const Color(0xFF16221C),
          dividerColor: const Color(0xFF25392F)),
      home: FarmHome(
          onTheme: () => setState(() => mode =
              mode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light),
          dark: mode == ThemeMode.dark));
}

class FarmHome extends StatefulWidget {
  const FarmHome({super.key, required this.onTheme, required this.dark});
  final VoidCallback onTheme;
  final bool dark;
  @override
  State<FarmHome> createState() => _FarmHomeState();
}

class _FarmHomeState extends State<FarmHome> {
  int tab = 0;
  int? chatSession;
  bool connected = false;
  final names = const [
    'Check Crops',
    'Live Camera',
    'Harvest Records',
    'Farm Advisor',
    'Harvesting Guide'
  ];
  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    try {
      await FarmApi.health();
      if (mounted) setState(() => connected = true);
    } catch (_) {
      if (mounted) setState(() => connected = false);
    }
  }

  void openTab(int index) => setState(() => tab = index);
  void openChat(int? id) {
    setState(() {
      chatSession = id;
      tab = 3;
    });
  }

  @override
  Widget build(BuildContext context) {
    final tabs = <Widget>[
      InspectScreen(onComplete: () => setState(() {})),
      LiveScreen(onSnapshot: () => setState(() {})),
      HistoryScreen(onAsk: openChat),
      AdvisorScreen(sessionId: chatSession),
      const GuideScreen()
    ];
    return Scaffold(
        body: SafeArea(
            child: Column(children: [
      Container(
          color: Theme.of(context).cardColor,
          padding: const EdgeInsets.fromLTRB(14, 8, 14, 8),
          child: Column(children: [
            Row(children: [
              Container(
                  width: 39,
                  height: 39,
                  decoration: BoxDecoration(
                      color: forest, borderRadius: BorderRadius.circular(11)),
                  child: const Icon(Icons.eco, color: Colors.white)),
              const SizedBox(width: 10),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text('Crop Maturity AI',
                        style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 18,
                            color:
                                Theme.of(context).textTheme.titleLarge?.color)),
                    const Text('TOMATO HARVEST GUIDE',
                        style: TextStyle(
                            color: forest,
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            letterSpacing: .8))
                  ])),
              Icon(
                  connected
                      ? Icons.cloud_done_outlined
                      : Icons.cloud_off_outlined,
                  size: 17,
                  color: connected ? forest : muted),
              const SizedBox(width: 3),
              Text(connected ? 'Online' : 'Offline',
                  style: const TextStyle(fontSize: 10, color: muted)),
              IconButton(
                  tooltip: widget.dark
                      ? 'Switch to Light Mode'
                      : 'Switch to Dark Mode',
                  onPressed: widget.onTheme,
                  icon: Icon(widget.dark
                      ? Icons.light_mode_outlined
                      : Icons.dark_mode_outlined))
            ]),
            SizedBox(
                height: 42,
                child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: names.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 5),
                    itemBuilder: (context, i) => ChoiceChip(
                        label: Text(names[i]),
                        avatar: Icon(
                            [
                              Icons.photo_camera_outlined,
                              Icons.videocam_outlined,
                              Icons.history,
                              Icons.chat_bubble_outline,
                              Icons.menu_book_outlined
                            ][i],
                            size: 15),
                        selected: tab == i,
                        onSelected: (_) => openTab(i),
                        selectedColor: forest,
                        labelStyle: TextStyle(
                            color: tab == i
                                ? Colors.white
                                : Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant,
                            fontSize: 11,
                            fontWeight: FontWeight.w700),
                        avatarBorder: const CircleBorder(),
                        showCheckmark: false,
                        backgroundColor: Theme.of(context).cardColor,
                        side: BorderSide(
                            color: tab == i
                                ? forest
                                : Theme.of(context).dividerColor),
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.symmetric(horizontal: 7))))
          ])),
      Expanded(
          child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(15, 14, 15, 28),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _HeroBanner(),
                    _StoryCards(onTap: openTab),
                    const SizedBox(height: 8),
                    tabs[tab],
                  ]))),
    ])));
  }
}

class _HeroBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
      height: 210,
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          image: const DecorationImage(
              image: AssetImage('assets/images/farm_hero.jpg'),
              fit: BoxFit.cover),
          boxShadow: const [
            BoxShadow(
                color: Color(0x18000000), blurRadius: 12, offset: Offset(0, 3))
          ]),
      child: Container(
          padding: const EdgeInsets.all(19),
          decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: LinearGradient(colors: [
                forestDark.withValues(alpha: .94),
                const Color(0xFF166534).withValues(alpha: .82),
                forest.withValues(alpha: .6)
              ], begin: Alignment.centerLeft, end: Alignment.centerRight)),
          child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _HeroPill(),
                SizedBox(height: 10),
                Text('Tomato Ripeness & Harvest Guide',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        height: 1.1,
                        fontWeight: FontWeight.w800)),
                SizedBox(height: 7),
                Text(
                    'Scan your vines for ripeness percentages, what is ready to pick today, and practical field advice.',
                    style: TextStyle(
                        color: Colors.white, fontSize: 13, height: 1.4))
              ])));
}

class _HeroPill extends StatelessWidget {
  const _HeroPill();
  @override
  Widget build(BuildContext c) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: .2),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withValues(alpha: .35))),
      child: const Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.auto_awesome, size: 13, color: Colors.white),
        SizedBox(width: 5),
        Text('Smart Harvest Companion',
            style: TextStyle(
                color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold))
      ]));
}

class _StoryCards extends StatelessWidget {
  const _StoryCards({required this.onTap});
  final ValueChanged<int> onTap;
  @override
  Widget build(BuildContext context) => Column(children: [
        _StoryCard(
            image: 'assets/images/harvest_basket.jpg',
            tag: 'HARVEST DECISION',
            title: 'Pick at Peak Flavor',
            description:
                'Scan tomato clusters to identify fully red fruit ready for picking today.',
            onTap: () => onTap(0)),
        _StoryCard(
            image: 'assets/images/tomato_stages.jpg',
            tag: 'RIPENESS STAGES',
            title: 'Green · Turning · Ripe',
            description:
                'Leave green fruit on the vine; ship turning fruit safely.',
            onTap: () => onTap(4)),
        _StoryCard(
            image: 'assets/images/greenhouse_rows.jpg',
            tag: 'FIELD SCANNER',
            title: 'Live Row Monitoring',
            description:
                'Point your phone down rows for continuous plant ripeness readings.',
            onTap: () => onTap(1)),
      ]);
}

class _StoryCard extends StatelessWidget {
  const _StoryCard(
      {required this.image,
      required this.tag,
      required this.title,
      required this.description,
      required this.onTap});
  final String image, tag, title, description;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => GestureDetector(
      onTap: onTap,
      child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(19),
              border: Border.all(color: Theme.of(context).dividerColor),
              boxShadow: const [
                BoxShadow(
                    color: Color(0x0A000000),
                    blurRadius: 10,
                    offset: Offset(0, 3))
              ]),
          clipBehavior: Clip.antiAlias,
          child: Row(children: [
            Image.asset(image, width: 118, height: 103, fit: BoxFit.cover),
            Expanded(
                child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                  color: const Color(0xFFF0FDF4),
                                  borderRadius: BorderRadius.circular(16)),
                              child: Text(tag,
                                  style: const TextStyle(
                                      color: forest,
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold))),
                          const SizedBox(height: 5),
                          Text(title,
                              style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color:
                                      Theme.of(context).colorScheme.onSurface)),
                          const SizedBox(height: 3),
                          Text(description,
                              style: TextStyle(
                                  fontSize: 11,
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurfaceVariant,
                                  height: 1.35))
                        ])))
          ])));
}
