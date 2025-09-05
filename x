[1mdiff --git a/src/pages/HomePage.tsx b/src/pages/HomePage.tsx[m
[1mindex e0bc650..8dd91c9 100644[m
[1m--- a/src/pages/HomePage.tsx[m
[1m+++ b/src/pages/HomePage.tsx[m
[36m@@ -45,7 +45,7 @@[m [mconst HomePage = () => {[m
     {[m
       title: "New Here?",[m
       onClick: handleNewHereClick,[m
[31m-      image: "url('/lovable-uploads/b0ff0916-cdec-4aea-9fb0-3f24252c47a1.png')",[m
[32m+[m[32m      image: "url('/lovable-uploads/This.jpg')",[m
       fallbackColor: "bg-gradient-to-br from-blue-500 to-blue-700"[m
     },[m
     {[m
[36m@@ -57,13 +57,13 @@[m [mconst HomePage = () => {[m
     {[m
       title: "Building Campaign",[m
       onClick: handleBuildingCampaignClick,[m
[31m-      image: "url('/lovable-uploads/614c1be1-495f-4281-82d1-05a287ae9374.png')",[m
[32m+[m[32m      image: "url('/lovable-uploads/Pic.jpg')",[m
       fallbackColor: "bg-gradient-to-br from-purple-500 to-purple-700"[m
     },[m
     {[m
       title: "Life Groups",[m
       onClick: handleLifeGroupsClick,[m
[31m-      image: "url('/lovable-uploads/006521d0-4062-4997-baa7-3c26c47ca6ab.png')",[m
[32m+[m[32m      image: "url('/lovable-uploads/next.jpg')",[m
       fallbackColor: "bg-gradient-to-br from-orange-500 to-orange-700"[m
     }[m
   ];[m
[36m@@ -128,8 +128,8 @@[m [mconst HomePage = () => {[m
             className={`relative overflow-hidden h-48 flex items-end cursor-pointer hover:opacity-90 transition-opacity ${card.fallbackColor} min-h-[192px]`}[m
             style={{ [m
               backgroundImage: card.image,[m
[31m-              backgroundSize: 'cover',[m
[31m-              backgroundPosition: 'center',[m
[32m+[m[32m              backgroundSize: index === 3 ? '140%' : 'cover',[m
[32m+[m[32m              backgroundPosition: index === 0 ? 'center 10%' : index === 2 ? 'center 20%' : index === 3 ? 'center 8%' : 'center',[m
               backgroundRepeat: 'no-repeat'[m
             }}[m
             onClick={card.onClick}[m
