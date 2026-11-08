module.exports={
 appId:'com.gratis.desktop',productName:'Gratis',directories:{output:'dist'},
 artifactName:'Gratis-${version}-${os}-${arch}.${ext}',
 files:['src/**/*','edition.json','package.json','LICENSE','licenses/**/*','assets/gratis-icon.png','assets/gratis.icns','!node_modules/@openai/codex-*/**/*'],
 extraResources:[{from:'assets/models',to:'models'}],
 asar:true,asarUnpack:['**/*.{node,dll,so,dylib}','**/onnxruntime-node/bin/**','**/@anthropic-ai/claude-agent-sdk-*/**'],
 npmRebuild:false,
 mac:{target:['dmg'],category:'public.app-category.productivity',icon:'assets/gratis.icns',identity:null,extendInfo:{NSMicrophoneUsageDescription:'Gratis records your voice only when you start dictation, so it can turn your speech into an editable message.'},extraResources:[{from:'assets/composio-cli',to:'composio-cli'}]},
 dmg:{title:'Gratis',contents:[{x:130,y:220},{x:410,y:220,type:'link',path:'/Applications'}]},
 win:{target:['nsis'],icon:'assets/gratis-icon.png',signAndEditExecutable:false},
 nsis:{oneClick:false,perMachine:false,allowToChangeInstallationDirectory:true,deleteAppDataOnUninstall:false,createDesktopShortcut:true,shortcutName:'Gratis'},
 linux:{target:['deb','AppImage'],icon:'assets/gratis-icon.png',category:'Utility',maintainer:'PromptAdvisers',synopsis:'Your personal AI assistants',desktop:{entry:{StartupWMClass:'Gratis'}}},
 deb:{depends:['libgtk-3-0','libnotify4','libnss3','libxss1','libxtst6','xdg-utils','libatspi2.0-0','libuuid1','libsecret-1-0']},
 publish:null
};
