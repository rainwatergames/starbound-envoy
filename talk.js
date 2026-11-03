/*! STARBOUND ENVOY v3.1.0 — reactive dialogue templates. © 2026 Rainwater Games (Jeff Rainwater). All rights reserved. */
// Data-driven lines for the living dialogue system. Keys -> voice -> (tier ->) line or [lines].
// Voices are derived from race traits (martial, sly, gentle, formal). Any race may override a key with rc.talk[key] (see SB_TALK_HOOKS).
// Vars: {X} other race short name, {XL} other race leader, {deed} what you did, {tone} your last tone, {n} visit count.
var SB_TALK={
 greet:{
  martial:{hostile:['"You dare show your hull here? Speak fast, before our guns decide for us."','"Enemy of our house. One wrong word and you burn."'],
           trusted:['"Shield-kin! Our docks, our fires and our blades are yours."','"The captain we would follow into a sun. Welcome home."']},
  sly:{hostile:['"Oh. You. Every price just tripled, and I am not even sorry."','"We remember your face, Concord envoy. Unfavorably."'],
       trusted:['"My favorite captain! For you, the real prices. Mostly."','"Ah, a friend. I will only lie to you about small things today."']},
  gentle:{hostile:['"We will speak, because we must. But we have not forgotten the harm you did."','"Your presence hurts here, Terran. Be brief."'],
          trusted:['"Dear friend. The whole world felt lighter when your ship arrived."','"You are family to us now. Sit, and stay as long as you like."']},
  formal:{hostile:['"You are not welcome, envoy of the Terran Concord. This channel stays open only out of protocol."','"State your business. Our patience with you is spent."'],
          trusted:['"Captain, our most honored partner in all the Terran Concord. The council sends its warmest regards."','"Trusted friend, every door here is open to you."']}
 },
 memory:{
  caught:{martial:'"Last time you named us liars. You were right, and we have not forgotten either part."',sly:'"You caught us out last time. Clever. Do not expect it twice."',gentle:'"You saw through us before. We are trying to be more honest with you."',formal:'"The record shows you exposed a falsehood of ours. Noted, and respected."'},
  extorted:{martial:'"You squeezed tribute from us before. Try it again and see what happens."',sly:'"Last visit you robbed us. Let us call that a loan, shall we?"',gentle:'"You took from us by force last time. It still aches."',formal:'"Our ledger still lists your extortion, Captain."'},
  gift:{martial:'"You brought us a gift once. A warrior remembers generosity."',sly:'"You gave us something for nothing last time. We are still suspicious, and grateful."',gentle:'"We still treasure the gift you brought us."',formal:'"Your earlier gift is on record and appreciated."'},
  threat:{martial:'"Last time you came in hot with threats. We liked that, a little."',sly:'"You threatened us last time. Bad for business, Captain."',gentle:'"Last time your voice was so harsh. Is today different?"',formal:'"You opened with threats on your last visit. We hope for better."'},
  warm:{martial:'"Back again, {n} visits now. You keep your word, it seems."',sly:'"Visit number {n}! You must like our prices."',gentle:'"You came back! That makes {n} visits. We counted."',formal:'"Welcome back. This is your visit number {n}."'}
 },
 enemyCozy:{martial:'"You are cozy with the {X}. Our enemy. Choose your friends with care."',sly:'"I hear you are very friendly with the {X}... we do not trust that."',gentle:'"You are close to the {X}. They have hurt us. Please understand our worry."',formal:'"Your warm ties with the {X}, our rivals, are a concern to this council."'},
 allyCozy:{martial:'"The {X} speak well of you. That counts for something here."',sly:'"Any friend of the {X} gets a better price. A slightly better price."',gentle:'"The {X} say you are kind. Our friends are rarely wrong."',formal:'"Our allies the {X} vouch for your conduct."'},
 metEnemy:{martial:'"So you have spoken to {XL}. Whatever they said about us is a lie."',sly:'"So you have been talking to {XL}? Hm. What did they tell you? No, do not answer."',gentle:'"You met {XL} of the {X}? Be careful there."',formal:'"We understand you have met {XL} of the {X}. We advise caution."'},
 metAlly:{martial:'"You fought beside... well, spoke with {XL}? Good. A solid people, the {X}."',sly:'"Ah, you know {XL}! Lovely. They owe me money."',gentle:'"You met {XL}! Give our love to the {X} next time."',formal:'"You have met {XL} of the {X}, our friends. Good."'},
 metOther:{martial:'"You have been around. The {X}, even. Interesting."',sly:'"So you have spoken to {XL}... nothing escapes my ears."',gentle:'"You have talked with the {X}? How are they?"',formal:'"Our records note your contact with the {X}."'},
 gossip:{martial:'"Word reached us: you {deed} the {X}. They are our allies. Remember that."',sly:'"Gossip travels faster than ships. You {deed} the {X}? Tsk."',gentle:'"We heard you {deed} the {X}. Our friends. Why would you do that?"',formal:'"Reports confirm you {deed} the {X}, our allies. This is noted."'},
 gossipGood:{martial:'"We heard you {deed} the {X}. Honorable."',sly:'"You {deed} the {X}? Look at you, a hero."',gentle:'"We heard you {deed} the {X}. Thank you."',formal:'"Reports say you {deed} the {X}. Commendable."'},
 leverOk:{martial:'"The {X} vouch for you? Then so do we."',sly:'"Well, if the {X} like you... fine, fine. You are in."',gentle:'"Any friend of the {X} is a friend of ours."',formal:'"The word of the {X} carries weight here. Very well."'},
 leverBad:{martial:'"The {X}? They are no friends of ours. Who fed you that lie?"',sly:'"The {X}?! Someone has been selling you bad intel, Captain."',gentle:'"The {X}... we are not friends with them. Someone misled you."',formal:'"The {X} are not our allies. Your information is false."'},
 contraOk:{martial:'"...{XL} told you that? Hm. Fine. The truth, then."',sly:'"{XL} talks too much. All right, all right. Here is the real story."',gentle:'"You spoke to {XL}. We are sorry. Here is the truth."',formal:'"The {X} have contradicted us. We withdraw our earlier statement."'},
 tip:{martial:'"The {X} nest at {where}? This is worth blood to us. Take this."',sly:'"{where}, you say? Oh, I can make money with that. Here, your cut."',gentle:'"You know where the {X} live? We only want to keep watch. Thank you."',formal:'"The location of the {X} at {where}. Most useful. You will be paid."'}
};
var SB_DEEDS={betrayed:'betrayed',extorted:'extorted',raided:'raided a ship of',sold:'sold the secrets of',helped:'did a kindness for',spared:'showed mercy to'};
// Per-race hooks: override any key above with a race's own voice. Others fall back to the voice templates.
var SB_TALK_HOOKS={
 ill:{greet:{hostile:'"It\'s me, it\'s me... and I am NOT happy with you, Captain."',trusted:'"Captain! My best friend! Want the secret handshake? You get the secret handshake."'},metOther:'"So you\'ve spoken to {XL}... Mike knows. Mike always knows."'},
 jef:{greet:{hostile:'"Jeff is very disappointed in you, Captain."',trusted:'"Captain! Jeff made you a snack. It is mostly gravel, but with love."'}},
 lob:{enemyCozy:'"Doing deals with the {X}? Ugh. Their auctions are rigged. Unlike ours. Mostly."',greet:{trusted:'"Premium customer! You get the gold lot catalog today."'}},
 the:{memory:{warm:'"Visit {n}. Your behavior has been consistent. That is logical."'},enemyCozy:'"Your affinity for the {X} is statistically troubling."'},
 kro:{greet:{hostile:'"Coward! You return? Then speak quickly, and mind your manners."',trusted:'"Blood-sibling! Sit, drink, sing of our battles!"'}},
 pem:{greet:{hostile:'"Oobu... sad. Oobu remember you were mean."',trusted:'"Friend! Friend! Oobu light up for friend!"'},metAlly:'"You met {XL}! Oobu likes {X}. Very kind."'},
 ack:{enemyCozy:'"You consort with the {X}. ACK. ACK ACK. We are watching you."'},
 quo:{enemyCozy:'"You visited those dome-headed {X}? That makes me very, very angry."'},
 mos:{memory:{warm:'"Returned, you have. {n} times now. Patient, you are becoming."'},gossip:'"Heard, we have, that you {deed} the {X}. Clouded, your path is."'},
 gli:{greet:{hostile:'"Ugh, YOU. The music literally stopped when you arrived."',trusted:'"VIP! Get this captain on the guest list forever!"'}}
};
// v3.0 light quest chains. Steps: talk (hail race r), scan (deep-scan r's homeworld), sell (sell good g to r). Step 0 starts when you hail r.
var SB_QUESTS=[
 {id:'firstlight',name:'First Light',steps:[
   {t:'talk',r:'hoo',say:'"The Kthrax are not mindless. Their clicks are grammar. Learn our primer (ask about translations), then go and listen to their world. No hurry; they have waited ten thousand years."',goal:'Get the Hoothvale translation primer, then deep-scan the Kthrax brood world at the galaxy\'s edge'},
   {t:'scan',r:'kth',say:'Scan trace: the hive song repeats one pattern over and over. Translated, it means: "Are we alone?"',goal:'Speak with the Kthrax Queen\'s drone-voice'},
   {t:'talk',r:'kth',say:'"*long hum*⟪You answered the song. The Queen agrees: a truce of the edge. We will take no inhabited world.⟫"',goal:'Bring the truce to the Hearthmoor council to ratify'},
   {t:'talk',r:'cmn',say:'"A truce with the Kthrax?! The council votes yes, every species, unanimously. Captain, you have changed the galaxy."'}],reward:{cr:600,rep:{kth:30,cmn:10,hoo:6,kgr:6,elv:6,mhr:6,vel:6,jef:6,vgt:6,tuf:6}}},
 {id:'stampede',name:'The Long Stampede',steps:[
   {t:'talk',r:'mhr',say:'"Star-friend, my herds toil in the serpents\' fields. Help us. First, learn how the Ssketh hold them."',goal:'Deep-scan the shared Ssketh/Mhorrak world to learn how the herds are held'},
   {t:'scan',r:'ssk',say:'Scan trace: the herd-pens are sealed by a single ziggurat power grid, and the Ssketh fear an off-world scandal far more than any revolt.',goal:'Rally an ally: ask the Duskvaren pack to stand with the herds'},
   {t:'talk',r:'dvk',say:'"Pack runs with herd. Duskvaren will howl beside the Mhorrak. Go, talk to the serpents."',goal:'Broker a treaty with the Ssketh (your evidence and allies give you leverage)'},
   {t:'talk',r:'ssk',say:'"…Very well. Faced with your evidence and the howling of wolves, the Ascendancy signs the Pasture Accord. The herds walk free."',goal:'Bring the news to Chieftain Torvag'},
   {t:'talk',r:'mhr',say:'"The herds run free under open sky! Some will settle in Hearthmoor Commons; all are free to choose."',goal:'Help the herds who wish to resettle: visit Hearthmoor Commons'},
   {t:'talk',r:'cmn',say:'"Mhorrak families! We built the big doors for you. Welcome home."'}],reward:{cr:350,rep:{mhr:15,cmn:6,dvk:5,kgr:4,ssk:-6}}},
 {id:'unbind',name:'The Quiet Unbinding',manual:true,steps:[
   {t:'expose',r:'ost',say:'',goal:'Confront the Ostrevayne with evidence of their holding pens'},
   {t:'free',r:'ost',say:'The salon falls silent. Velorien sets down his glass. "…Very well. The contracts are void."',goal:'Free the captives: negotiate, buy out their contracts, expose them with intel, or bring allied pressure (no rush)'},
   {t:'talk',r:'cmn',say:'"Welcome, all of you! Soup first, then houses. You are Hearthmoor folk now."',goal:'Bring the freed workers to Hearthmoor Commons, who offered them a home'}],reward:{cr:300,rep:{cmn:10,pem:4,kgr:8,elv:8,mnd:6,oob:5}}},
 {id:'envoy',name:'The Missing Envoy',steps:[
   {t:'talk',r:'pem',say:'"Oobu\'s envoy flew toward the Hollowmere and never came back. Please find?"',goal:'Deep-scan the Hollowmere homeworld for the lost Pemblee envoy'},
   {t:'scan',r:'hol',say:'Scan trace: a Pemblee pod in Hollowmere orbit, its pilot asleep in stasis. You tow it free.',goal:'Bring the news back to the Pemblee'},
   {t:'talk',r:'pem',say:'"Envoy home! Oobu glows forever for you!"'}],reward:{cr:220,rep:{pem:10,hol:2}}},
 {id:'dome',name:'Dispute Under the Dome',steps:[
   {t:'talk',r:'quo',say:'"Those Akkari built their dome over MY launch pad. Tell them to move it. Or else."',goal:'Hear the Akkari side'},
   {t:'talk',r:'ack',say:'"ACK. The pad is ugly. ACK. We... could share the sky dock. Tell the small one."',goal:'Return the offer to the Quorbit'},
   {t:'talk',r:'quo',say:'"A shared dock? ...Fine. Nobody explodes today. You have done well, Terran."'}],reward:{cr:160,rep:{quo:8,ack:8}}},
 {id:'smuggle',name:'Smuggler\'s Wake',steps:[
   {t:'talk',r:'vul',say:'"A Lobbish auction-house is moving stolen relics. Scan their world and we will have proof."',goal:'Deep-scan the Lobbish homeworld'},
   {t:'scan',r:'lob',say:'Scan trace: crates of stolen relics in a sealed Lobbish vault. Evidence recorded.',goal:'Deliver the evidence to the Vulpra'},
   {t:'talk',r:'vul',say:'"Lovely evidence. The network thanks you, and the Lobbish will be... audited."'}],reward:{cr:260,rep:{vul:10,lob:-6},intel:1}},
 {id:'feast',name:'Feast of the Burrow',steps:[
   {t:'talk',r:'fur',say:'"Big feast for our Mitling neighbors! We need spice. Bring spice, yes?"',goal:'Sell Spice to the Furrmuk'},
   {t:'sell',r:'fur',g:'spice',say:'"SPICE! Now the feast can be big. Go tell the Mitlings they are invited!"',goal:'Invite the Mitlings'},
   {t:'talk',r:'mit',say:'"A feast? With the Furrmuk? We will bring the kittens!"'}],reward:{cr:140,rep:{fur:8,mit:8}}},
 {id:'frost',name:'Frost and Judgment',steps:[
   {t:'talk',r:'isk',say:'"A Korvath tribunal holds one of our pilots. Scan their world and find where."',goal:'Deep-scan the Korvath homeworld'},
   {t:'scan',r:'kov',say:'Scan trace: an Iskari pilot in a Korvath holding cell, block nine.',goal:'Report to the Iskari'},
   {t:'talk',r:'isk',say:'"Block nine. Our strike team will do the rest. You have the Frostguard\'s thanks."'}],reward:{cr:200,rep:{isk:10,kov:-5},intel:1}},
 {id:'tide',name:'Song of the Tides',steps:[
   {t:'talk',r:'lir',say:'"Our oldest song is lost. The Mossgrim sages may remember it."',goal:'Ask the Mossgrim about the song'},
   {t:'talk',r:'mos',say:'"Remember it, I do. Carry it on art, they must. Bring them art, you should."',goal:'Sell Art to the Lirrith'},
   {t:'sell',r:'lir',g:'art',say:'"The song lives again! The tide sings your name now."'}],reward:{cr:180,rep:{lir:10,mos:5}}},
 {id:'glitter',name:'Glitter Truce',steps:[
   {t:'talk',r:'gli',say:'"The Belladrae keep turning OFF our music at night. Rude! Go talk to them?"',goal:'Hear the Belladrae side'},
   {t:'talk',r:'bel',say:'"We sleep at night, Captain. Perhaps they could play quieter after midnight?"',goal:'Bring the compromise to the Glitterine'},
   {t:'talk',r:'gli',say:'"Quiet after midnight... ugh, FINE. Silent disco it is. Thanks, Captain!"'}],reward:{cr:150,rep:{gli:8,bel:8}}},
 {id:'logic',name:'An Illogical Theft',steps:[
   {t:'talk',r:'the',say:'"Our star charts were copied. Probability suggests the Grawthak. Scan their world."',goal:'Deep-scan the Grawthak homeworld'},
   {t:'scan',r:'grw',say:'Scan trace: Thessari chart cores in a Grawthak raider\'s hold.',goal:'Report to the Thessari'},
   {t:'talk',r:'the',say:'"Confirmed. Your assistance was efficient. Accept these coordinates as payment."'}],reward:{cr:200,rep:{the:10},intel:2}}
];
SB_QUESTS.push({id:'bowl',name:'The Great Bowl Invasion',steps:[
  {t:'talk',r:'glb',say:'"Terran! Carry our ULTIMATUM to the Grawthak: surrender or face the Glubbari! Make it sound scary."',goal:'Deliver the Glubbari ultimatum to the Grawthak'},
  {t:'talk',r:'grw',say:'Dhuun Ketch reads it, wheezes with laughter, and frames it on the war-room wall. "Tell the fish we surrender. HAH. Tell them that."',goal:'Report back to Bubblesnout'},
  {t:'talk',r:'glb',say:'"They SURRENDERED?! GLORY! Today the Grawthak, tomorrow the galaxy! You are hereby Knight of the Bowl."'}],reward:{cr:120,rep:{glb:12,grw:3}}});
// other races mocking the Glubbari (used when you've met them)
var SB_GLUB_MOCK={martial:['"Glubbari? We use their bowl-ships for target practice. They thank us for the attention."','"A goldfish declared war on our flagship. We let it win, for morale."'],
 sly:['"The Glubbari tried to invade us. We sold them a bigger bowl instead."','"Have you met the fish? Adorable. Useless. Adorable."'],
 gentle:['"The Glubbari mean well, in a shouty way. Please do not tap their glass."','"We sent the Glubbari a nice plant. They declared it a prisoner of war."'],
 formal:['"The Glubbari fleet poses no measurable threat. We have measured."','"We received the Glubbari ultimatum. It was written in crayon. We filed it."']};
if(typeof SB_DEEDS!=='undefined')SB_DEEDS.swatted='swatted the ship of';
