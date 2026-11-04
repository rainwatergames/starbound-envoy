/* v3.2 dialogue: temperaments, varied approaches, per-race topic trees. Loaded after data21.js. */
const SB_TONE_POOL={
 friendly:{labels:['Friendly','Warm','Open-handed'],lines:['"Greetings! We come in friendship and good faith."','"Hello there! We would love to be friends."','"Peace and good company to you. We mean well."']},
 firm:{labels:['Firm','Direct','Steady'],lines:['"We are here on business. Let\'s be direct."','"I will be plain: we want a working deal."','"Captain of the Concord. State your terms, I will state mine."']},
 threat:{labels:['Threatening','Intimidate','Show of force'],lines:['"Cooperate, or my ship will make you cooperate."','"My guns are warm. Choose your words carefully."','"You do not want me as an enemy."']},
 flatter:{labels:['Flattering','Compliment','Admiring'],lines:['"Your people are renowned across the stars."','"I have heard nothing but praise for your people."','"What a magnificent world you keep."']},
 haggle:{labels:['Haggling','Bargain','Deal-maker'],lines:['"Let\'s talk numbers. I came to make a deal worth both our time."','"Everything has a price. Shall we find yours?"','"I have cargo, you have needs. Let\'s haggle."']},
 blunt:{labels:['Honest','Blunt','Plain truth'],lines:['"I will be honest: I need allies, and I need information."','"No games. Here is exactly who I am and what I want."','"Facts first: we are new here and we need help."']},
 joke:{labels:['Joking','Playful','Light-hearted'],lines:['"Is this the galaxy\'s best party, or did I take a wrong turn?"','"I was told to bring a gift. I brought my charming personality."','"Knock knock. It\'s the Terrans. We come in pieces. Peace! We come in peace."']},
 calm:{labels:['Calm','Soothing','Patient'],lines:['"Slowly. There is no hurry. We are only here to listen."','"Breathe easy. We mean no harm, and we will wait."','"Quietly, gently: we come to learn, not to take."']}};
const SB_TONE_IDS=Object.keys(SB_TONE_POOL);
const SB_ARCH={
 warrior:{re:/warrior|honor|mercenar|hunter|raider|soldier|champion|brawl|admiral|fleet|tactician|ranger/i,d:{firm:7,threat:3,blunt:4,friendly:1,flatter:-4,joke:-1,haggle:-2,calm:0},hint:'Respects strength and plain speech; scorns flattery.'},
 trader:{re:/merchant|trade|profit|auction|caravan|deal|smuggl|broker|crime|street-boss|courier|stash/i,d:{haggle:7,firm:3,friendly:1,flatter:1,blunt:1,joke:1,calm:-1,threat:-4},hint:'Loves a good haggle; warmth alone buys nothing.'},
 logic:{re:/logic|machine|android|scholar|research|scientist|archiv|study|watcher|owl|sage|seer|strateg|bureaucrat|mind|monolith/i,d:{blunt:7,firm:3,calm:2,friendly:0,haggle:0,flatter:-3,joke:-2,threat:-5},hint:'Values blunt honesty; finds jokes and praise inefficient.'},
 hive:{re:/hive|swarm|insect|collective|chorus|mosquito|ant-|chitin/i,d:{calm:7,blunt:2,firm:2,friendly:0,flatter:-1,joke:-2,haggle:-1,threat:-6},hint:'Calmed by calm voices; loud emotion alarms the swarm.'},
 sly:{re:/secret|schem|trust no one|spy|spies|shadow|police|espionage|invader|trickster/i,d:{blunt:5,firm:3,haggle:2,calm:1,joke:0,friendly:-2,flatter:-2,threat:-5},hint:'Suspicious of easy warmth; trusts those who speak plainly.'},
 party:{re:/party|festival|cheerful|jolly|show|perform|wisecrack|clumsy|excitable|daredevil|gossip|song|sing|brew|hamster|athlete/i,d:{joke:7,friendly:3,flatter:2,calm:0,firm:0,haggle:0,blunt:-1,threat:-5},hint:'Loves a joke; stiffness falls flat.'},
 proud:{re:/aristocra|regal|proud|elves|aloof|gilded|refined|emperor|egos|look down|beautiful|advanced/i,d:{flatter:7,firm:2,friendly:1,calm:1,haggle:-1,joke:-2,blunt:-3,threat:-6},hint:'Proud: courtesy and praise open doors; bluntness offends.'},
 gentle:{re:/gentle|shy|mellow|serene|cozy|spiritual|empath|caretak|garden|healer|botan|telepath|short-lived|undertaker|mystic|mud beings|hum instead/i,d:{calm:6,friendly:4,joke:1,flatter:0,firm:-1,blunt:-1,haggle:-2,threat:-7},hint:'Gentle souls: a calm, patient voice matters more than words.'},
 base:{d:{firm:4,blunt:3,calm:2,friendly:2,flatter:1,haggle:1,joke:0,threat:-4},hint:'Prefers directness to sweetness.'}};
const SB_ARCH_OVR={glb:'glbx',kro:'warrior',gor:'warrior',hun:'warrior',grw:'warrior',mhr:'warrior',isk:'warrior',fhn:'warrior',lob:'trader',grz:'trader',vel:'trader',mah:'trader',gru:'trader',hoo:'logic',the:'logic',syn:'logic',lnw:'logic',uth:'logic',pip:'logic',kth:'hive',kri:'hive',zzv:'hive',hiv:'hive',ill:'sly',nyr:'sly',vul:'sly',kgr:'sly',fur:'party',frg:'party',gli:'party',cub:'gentle',mud:'gentle',ser:'gentle',jef:'proud',ael:'proud',ost:'proud',mit:'proud',vld:'proud'};
SB_ARCH.glbx={d:{threat:5,flatter:6,joke:2,firm:1,friendly:0,calm:-1,haggle:-1,blunt:-3},hint:'Laughs off threats; adores being called mighty.'};
function sbArch(rc){if(SB_ARCH_OVR[rc.id])return SB_ARCH_OVR[rc.id];for(const k of ['hive','warrior','logic','sly','trader','party','proud','gentle'])if(SB_ARCH[k].re.test(rc.kind))return k;return'base';}
const SB_TONE_REPLY={
 pos:{warrior:['"Hm. You speak like a warrior. Good."','"Plain words. I respect that."'],trader:['"Now THAT is how you open a conversation!"','"A deal-maker! Sit, sit."'],logic:['"Efficient. Proceed."','"Honesty noted and appreciated."'],hive:['"...calm... the swarm... settles..."','"Quiet voice. Good voice. We listen."'],sly:['"No sugar? How refreshing. Go on."','"Plain words. Rare. We will listen."'],party:['"HA! Oh, you are FUN."','"Okay, okay, I like you already."'],proud:['"At last, someone with manners."','"How gracious. You may continue."'],gentle:['"Thank you for being gentle."','"That is kind. Please, stay a while."'],glbx:['"HAHAHA! YOU THINK YOU CAN SCARE US? WE RESPECT YOUR AUDACITY!"','"YES. YES! FINALLY SOMEONE UNDERSTANDS OUR MAGNIFICENCE!"'],base:['"Fair enough. Let\'s talk."','"Good. That works for us."']},
 neg:{warrior:['"Spare me the honey."','"Weak words."'],trader:['"Feelings don\'t pay docking fees."','"Hmph."'],logic:['"Irrelevant."','"That is not data."'],hive:['"...too loud... the swarm bristles..."','"Agitation. Agitation."'],sly:['"Too sweet. What are you hiding?"','"Hm. Suspicious."'],party:['"Wow. Okay. Tough crowd, huh?"','"Yikes. Loosen up, Captain."'],proud:['"How... coarse."','"We are not amused."'],gentle:['"Oh. That frightens us."','"Please, softer."'],glbx:['"WHAT. HOW DARE."','"WE ARE NOT AMUSED, LAND-BLOB."'],base:['"Hm. Not a great start."','"Let\'s keep this civil."']},
 neu:['"Mm. Go on."','"I see. Continue."','"Fine."']};
/* temperament: legacy tones blended with archetype; friendly is never the best */
function sbTemper(rc){if(rc._temper)return rc._temper;const a=SB_ARCH[sbArch(rc)],T={};
  SB_TONE_IDS.forEach(t=>{const L=rc.tones&&rc.tones[t]?rc.tones[t][0]:null;T[t]=L===null?a.d[t]:Math.round((L+a.d[t]*2)/3);});
  const best=Math.max(...SB_TONE_IDS.filter(t=>t!=='friendly').map(t=>T[t]));if(T.friendly>=best)T.friendly=best-2;
  if(rc.friendBoost&&T.friendly<best)T.friendly=Math.max(T.friendly,best-1);
  return rc._temper=T;}
function sbToneReply(rc,t){if(rc.tones&&rc.tones[t]&&(Math.sign(rc.tones[t][0])===Math.sign(sbTemper(rc)[t])))return rc.tones[t][1];
  const d=sbTemper(rc)[t],a=sbArch(rc),B=d>=3?SB_TONE_REPLY.pos[a]:d<0?SB_TONE_REPLY.neg[a]:SB_TONE_REPLY.neu;return B[(rc.id.charCodeAt(0)+t.length)%B.length];}
function sbHash(s){let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h;}
/* 4 approaches per hail, rotating; at least one good option always present */
function sbToneSet(rc,seed){const T=sbTemper(rc);const ids=SB_TONE_IDS.slice().sort((a,b)=>sbHash(seed+a+rc.id)-sbHash(seed+b+rc.id));let s=ids.slice(0,4);
  if(!s.some(t=>T[t]>=3)){const g=ids.find(t=>T[t]>=3);if(g)s[3]=g;}
  return s.sort((a,b)=>SB_TONE_IDS.indexOf(a)-SB_TONE_IDS.indexOf(b)).map(t=>{const P=SB_TONE_POOL[t],h=sbHash(seed+t+rc.id);return{id:t,label:P.labels[h%P.labels.length],line:P.lines[(h>>3)%P.lines.length]};});}
/* generic questions phrased per voice */
const SB_GENERIC={needs:{martial:'"What does your house need, warrior?"',sly:'"What are you short on? I won\'t tell."',gentle:'"Is there anything your people need?"',formal:'"What do your people need?"'},
 politics:{martial:'"Who stands with you, and who do you fight?"',sly:'"Who are you friends with, really?"',gentle:'"Who are your friends? Anyone you worry about?"',formal:'"Who are your friends, and your rivals?"'},
 region:{martial:'"What moves in the lanes?"',sly:'"Heard anything juicy lately?"',gentle:'"What is happening around here?"',formal:'"What news from the region?"'},
 special:{martial:'"What could we do for each other?"',sly:'"Got any work for a discreet captain?"',gentle:'"Can we help each other somehow?"',formal:'"Is there anything we can do for each other?"'}};
/* topic trees. node: {q,a,f:[nodes],need:{rep,visit},lore} */
const SB_ARCH_TOPICS={
 warrior:rc=>[{q:'"Tell me of your greatest battle."',a:'"Ha! Sit, outsider. The '+rc.short+' remember every scar."',f:[{q:'"Who was the enemy?"',a:'"A foe worthy of us. That is all that matters."',f:[{q:'"Would you fight them again?"',a:'"Every day, and twice at feasts."',need:{rep:20},lore:'Their war-songs count every scar.'}]},{q:'"Did you lose anyone?"',a:'"Many. We sing their names at every feast."',lore:'They sing their dead at feasts.'}]},
  {q:'"What makes a warrior honorable here?"',a:'"Keep your word. Face your enemy. Never strike the weak."',f:[{q:'"And if someone breaks their word?"',a:'"Then they are no one to us."'}]},
  {q:'"Will you test my crew?"',a:'"Arm-wrestling at dawn. Bring your strongest."',need:{rep:15},f:[{q:'"We accept."',a:'"Good. You may lose with honor."',rep:2}]}],
 trader:rc=>[{q:'"What\'s the hottest item on the market?"',a:'"'+((typeof RES!=='undefined'&&RES[rc.wants[0]])?RES[rc.wants[0]].name:rc.wants[0])+'! Everyone wants it, nobody has enough."',f:[{q:'"Where does it come from?"',a:'"If I told you that, I would be poorer."',f:[{q:'"I could make it worth your while."',a:'"...Check the outer ports. You didn\'t hear it from me."',need:{rep:20},lore:'Their best goods come through the outer ports.'}]},{q:'"How much would you pay?"',a:'"Bring it and find out. Generously, for a friend."'}]},
  {q:'"What is the best deal you ever made?"',a:'"I sold the same moon twice. Legally!"',f:[{q:'"How is that legal?"',a:'"The fine print had fine print."'}]},
  {q:'"Any tips for a newcomer trader?"',a:'"Buy where it\'s common, sell where it\'s rare. Never say your top price first."',f:[{q:'"What is your top price?"',a:'"Ha! See? You learn fast."',rep:1}]}],
 logic:rc=>[{q:'"What are you studying right now?"',a:'"The '+rc.short+' study everything. Currently: you."',f:[{q:'"What have you learned about us?"',a:'"You are loud, curious, and statistically lucky."',f:[{q:'"Is that a compliment?"',a:'"It is an observation. Compliments are imprecise."',lore:'They consider compliments imprecise.'}]},{q:'"Can we read your findings?"',a:'"When you have earned access. Rep threshold: trusted."',need:{rep:30}}]},
  {q:'"What is the biggest unsolved question?"',a:'"Why the old lanes formed where they did. No answer yet."',f:[{q:'"Could we help find out?"',a:'"Bring data from the edge of the charts."'}]},
  {q:'"How do you make decisions?"',a:'"By evidence, then debate, then evidence again."',f:[{q:'"Sounds slow."',a:'"Correct. Also correct, which is the point."'}]}],
 hive:rc=>[{q:'"How does the swarm decide?"',a:'"...many voices... one hum..."',f:[{q:'"Do you ever disagree?"',a:'"...disagreement... is a louder hum..."',lore:'They decide by the loudness of their hum.'}]},
  {q:'"What does the swarm fear?"',a:'"...loud ships... fire... sudden things..."',f:[{q:'"We will approach quietly."',a:'"...good... good..."',rep:1}]},
  {q:'"What does the swarm want?"',a:'"...to grow... to be fed... to be left in peace..."',f:[{q:'"Can we help it grow?"',a:'"...bring '+rc.wants[0]+'..."'}]}],
 sly:rc=>[{q:'"What secret is worth the most out here?"',a:'"The one nobody knows exists. Next question."',f:[{q:'"Then what\'s the second-best secret?"',a:'"Ha. Better. Come back when we trust you."',f:[{q:'"Do you trust us now?"',a:'"A little. Watch the quiet ones."',need:{rep:25},lore:'They warn: watch the quiet ones.'}]}]},
  {q:'"Why are you so careful with outsiders?"',a:'"Because outsiders are never careful with us."',f:[{q:'"We could change that."',a:'"Prove it with actions, not tones."'}]},
  {q:'"Who do you watch?"',a:'"Everyone. Including you, right now."',f:[{q:'"And what do you see?"',a:'"A captain asking too many questions. We like that."'}]}],
 party:rc=>[{q:'"What\'s the next big celebration?"',a:'"Tomorrow! And the day after. We celebrate celebrations."',f:[{q:'"Can we come?"',a:'"You MUST come. Bring snacks."',f:[{q:'"What kind of snacks?"',a:'"The weird kind. Surprise us!"',lore:'They love surprising snacks.'}]}]},
  {q:'"Tell me a joke from your world."',a:'"Why did the comet break up with the moon? It needed space. HA!"',f:[{q:'"That was terrible."',a:'"THANK you! That\'s the best kind!"',rep:1}]},
  {q:'"What makes you happiest?"',a:'"Friends, music, and things that go bang in a FUN way."',f:[{q:'"Things that go bang?"',a:'"Fireworks! Mostly fireworks."'}]}],
 proud:rc=>[{q:'"Tell me about your greatest achievement."',a:'"Where to begin? Our history is one long masterpiece."',f:[{q:'"Start with the best part."',a:'"The founding. Ask again when you have proven worthy."',f:[{q:'"Have I proven worthy?"',a:'"Barely. Very well: we were the first to build a lane-beacon."',need:{rep:25},lore:'They claim the first lane-beacon.'}]}]},
  {q:'"What do outsiders misunderstand about you?"',a:'"That we are arrogant. We are simply correct."',f:[{q:'"Fair point."',a:'"You learn quickly. For a Terran."',rep:1}]},
  {q:'"What would you like the galaxy to know?"',a:'"That good manners are the foundation of civilization."',f:[{q:'"How can we show good manners?"',a:'"Never interrupt. Always bring a gift."'}]}],
 gentle:rc=>[{q:'"How do you spend your days?"',a:'"Slowly, mostly. Tending, listening, resting."',f:[{q:'"That sounds peaceful."',a:'"It is. You are welcome to try it."',f:[{q:'"Teach me?"',a:'"Sit. Breathe. There, you are learning."',need:{rep:15},lore:'They teach patience to anyone who sits with them.'}]}]},
  {q:'"What do your people treasure?"',a:'"Quiet mornings, and friends who come back."',f:[{q:'"We will come back."',a:'"Then you are already a friend."',rep:1}]},
  {q:'"Is anything troubling you?"',a:'"Loud ships, sometimes. And worry for those we love."',f:[{q:'"Can we help?"',a:'"Bring '+rc.wants[0]+', if you can. It helps more than you know."'}]}],
 base:rc=>[{q:'"Tell me about your homeworld."',a:'"It is home. The '+rc.short+' have kept it for a long time."',f:[{q:'"What do you love about it?"',a:'"The quiet before dawn."',lore:'They love the quiet before dawn.'}]},
  {q:'"What brought your people to the stars?"',a:'"Curiosity, and a little stubbornness."',f:[{q:'"Mostly stubbornness?"',a:'"Mostly stubbornness."',rep:1}]},
  {q:'"What should a newcomer know?"',a:'"Keep your word, pay your fees, and do not insult anyone\'s mother."',f:[{q:'"Good advice."',a:'"It has saved many lives."'}]}],
 glbx:rc=>SB_TOPICS_HAND.glb};
const SB_TOPICS_HAND={
 kro:[{q:'"Tell me of your greatest battle."',a:'"The Siege of Red Ember! Nine days, nine nights, one cauldron of stew."',f:[{q:'"A stew?"',a:'"The stew was the prize. We won it. It was terrible. Glorious!"',f:[{q:'"Could I taste it?"',a:'"HA! Earn a seat at the feast first."',need:{rep:25},lore:'The Siege of Red Ember was fought over a stew.'}]},{q:'"Who led the charge?"',a:'"Thane Morgath\'s grandmother. With a ladle."'}]},
  {q:'"How does one earn a Krovhai\'s respect?"',a:'"Stand your ground. Speak plainly. Never flatter."',f:[{q:'"Like this?"',a:'"Hm. Better than most."',rep:1}]},
  {q:'"What do you feast on?"',a:'"Spiced beast, black bread, and stories of the dead."',f:[{q:'"Can we bring spice?"',a:'"Bring spice and you will be sung about."'}]},
  {q:'"Is there a duel I could witness?"',a:'"Every dawn. Bring a strong stomach."',need:{visit:2}}],
 lob:[{q:'"What\'s the hottest item?"',a:'"Today? Relics! Yesterday? Also relics. Tomorrow? We\'ll auction that off too."',f:[{q:'"Who\'s buying?"',a:'"Everyone with ears. And some without!"',f:[{q:'"Got any inside tips?"',a:'"Bid early on the boring lots. Nobody watches those."',need:{rep:20},lore:'Lobbish tip: bid early on the boring lots.'}]},{q:'"What is a relic worth here?"',a:'"More than you paid. Less than I\'ll ask!"'}]},
  {q:'"Can I auction something?"',a:'"Of course! The auction of your auction starts at fifty credits."',f:[{q:'"That\'s ridiculous."',a:'"SOLD! To the Terran who called it ridiculous!"',rep:1}]},
  {q:'"What\'s the strangest thing you ever sold?"',a:'"A Tuesday. Buyer was very happy."',f:[{q:'"How do you sell a Tuesday?"',a:'"Very carefully, on a Monday."'}]}],
 hoo:[{q:'"What are you studying?"',a:'"Hoo! Star-charts older than your sun, Captain, in candlelight."',f:[{q:'"What have they shown you?"',a:'"That the lanes were drawn by someone. Deliberately."',f:[{q:'"By whom?"',a:'"Hoo... that page is missing. Bring old relics and we may find it."',need:{rep:20},lore:'The Hoothvale believe the lanes were drawn deliberately.'}]},{q:'"Why candlelight?"',a:'"Screens lie. Ink remembers."'}]},
  {q:'"May I visit your library?"',a:'"Quietly, and with clean claws."',f:[{q:'"I have no claws."',a:'"Then you will be especially careful."',rep:1}]},
  {q:'"What is the oldest book you own?"',a:'"A cookbook. Most wisdom starts in a kitchen."'}],
 glb:[{q:'"Tell me of your mighty empire."',a:'"IT IS VAST! THREE BOWLS! SOON FOUR!"',f:[{q:'"Four bowls?!"',a:'"YES! FEAR US!"',f:[{q:'"Truly terrifying, Admiral."',a:'"...YOU MAY LIVE. FOR NOW."',rep:2,lore:'The Glubbari empire is three bowls (soon four).'}]},{q:'"Who rules it?"',a:'"I DO! GRAND ADMIRAL BUBBLESNOUT THE UNBOWED!"'}]},
  {q:'"What do you need, Admiral?"',a:'"WATER! FRESH! FOR THE BOWL! ...please."',f:[{q:'"We can bring water."',a:'"YOU ARE A WORTHY VASSAL."',rep:1}]},
  {q:'"Why attack ships so much bigger?"',a:'"THERE ARE NO BIGGER SHIPS. ONLY CLOSER ONES."'}],
 fur:[{q:'"Why do you love cats so much?"',a:'"Love? Ha! We... appreciate them. Deeply. Possibly with ketchup. KIDDING."',f:[{q:'"Were you kidding?"',a:'"...Mostly! Next question!"',lore:'The Furrmuk are suspiciously fond of cats.'}]},
  {q:'"Tell me your best joke."',a:'"What do you call a ship full of cats? A purr-suit vessel! Ha!"',f:[{q:'"Boo."',a:'"Tough crowd! I love it!"',rep:1}]},
  {q:'"What\'s this junk everywhere?"',a:'"Junk? This is a COLLECTION, Captain."',f:[{q:'"Collection of what?"',a:'"Spare parts for things I haven\'t built yet."'}]}],
 the:[{q:'"What is logic\'s greatest problem?"',a:'"Other people."',f:[{q:'"Including us?"',a:'"Currently, yes. That may change with data."',f:[{q:'"What data would help?"',a:'"Consistency. Do what you say, every time."',need:{rep:20},lore:'Thessari judge outsiders by consistency.'}]}]},
  {q:'"Do you miss emotions?"',a:'"That question assumes a feeling. Rephrase."',f:[{q:'"Is there any value you lost?"',a:'"Music, possibly. We study it for evidence."'}]},
  {q:'"How should I speak to you?"',a:'"Plainly. Truthfully. Briefly. You have exceeded briefly."'}],
 kth:[{q:'"What does the Queen want?"',a:'"...the Queen... wants... the hive to grow..."',f:[{q:'"Must it grow into others?"',a:'"...that... is the Queen\'s question..."',f:[{q:'"Ask her for us."',a:'"...the Queen... heard... a calm voice. She will think."',need:{rep:10},lore:'Calm voices reach the Kthrax Queen.'}]}]},
  {q:'"Why are you so feared?"',a:'"...many legs... many jaws... few words..."'},
  {q:'"What calms the hive?"',a:'"...quiet... slow ships... patience..."',f:[{q:'"We can be patient."',a:'"...good..."',rep:1}]}],
 frg:[{q:'"What\'s on tonight\'s show?"',a:'"A juggling eel, a choir of crickets, and me, singing a song about rain!"',f:[{q:'"Can I be in it?"',a:'"Can you dance? No matter! Nobody here can either!"',f:[{q:'"Sign me up."',a:'"Yaaay! Rehearsal is never, show is always!"',rep:2,lore:'The Croakhollow Revue welcomes any act.'}]}]},
  {q:'"How did the Revue start?"',a:'"With one frog, one banjo, and a very patient swamp."'},
  {q:'"What does a showrunner worry about?"',a:'"Everything! The lights, the eels, the critics... mostly the eels."'}]};
function sbTopics(rc){return SB_TOPICS_HAND[rc.id]||SB_ARCH_TOPICS[sbArch(rc)](rc);}
