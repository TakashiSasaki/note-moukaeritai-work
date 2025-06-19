# **第8章: 共有URL機能**

### **目次**

8.1. 要件とURL構造  
8.2. 実装アーキテクチャ  
8.3. 処理フロー  
8.4. OGP対応とアプリへの誘導

### **8.1. 要件とURL構造**

各ノートには、SNSなどで共有可能で、かつ個人を特定する情報を含まない一意なURLを割り当てることができる。

* **URL形式**: https://\<your-app-domain\>/notes/\<noteId\>  
  * \<your-app-domain\>: Firebase Hostingで設定するカスタムドメイン。  
  * \<noteId\>: ノートのグローバルに一意なID (UUID)。

ユーザーは、ノートごとにisPublicフラグをtrueに設定することで、そのノートの共有URLを有効化できる。

### **8.2. 実装アーキテクチャ**

この機能はFirebase HostingとHTTPトリガーのCloud Function (viewNote) を連携させて実現する。

* **Firebase Hosting Rewrites**: Hostingの設定 (firebase.json) で、/notes/\* という特定のパスパターンへのリクエストを、viewNote関数に内部的に転送（リライト）するよう構成する。これにより、静的なファイルが存在しない動的なURLを処理できる。  
  // firebase.json  
  "hosting": {  
    // ...  
    "rewrites": \[  
      {  
        "source": "/notes/\*\*",  
        "function": "viewNote"  
      }  
    \]  
  }

* **Cloud Function (viewNote)**: HTTPリクエストをトリガーとして実行され、動的にHTMLページを生成する責務を負う。

### **8.3. 処理フロー**

1. **URLへのアクセス**: ユーザーまたはSNSのクローラーがブラウザで https://.../notes/\<noteId\> にアクセスする。  
2. **Hosting Rewrites**: Firebase Hostingがリクエストを受け取り、viewNote関数に転送する。  
3. Cloud Functionの実行:  
   a. viewNote関数は、リクエストURLから\<noteId\>を抽出する。  
   b. publicNotesコレクションをnoteIdで直接検索し、ノートの公開情報を取得する。  
   c. ドキュメントが存在しない（非公開または存在しないノート）場合は、404 Not Foundページを返す。  
   d. ドキュメントが存在する場合、その内容（title, description, imageUrl等）を使ってHTMLを動的に生成する。  
   e. 生成したHTMLをレスポンスとしてクライアントに返す。

### **8.4. OGP対応とアプリへの誘導**

viewNote関数が生成するHTMLには、以下の要素を含める。

* **OGP (Open Graph Protocol) メタタグ**: Facebook, X (旧Twitter), Slackなどで共有された際に、ノートのタイトル、説明、カバー画像がリッチなプレビューとして表示されるように、\<meta\>タグを設定する。  
  \<meta property="og:title" content="【ノートのタイトル】"\>  
  \<meta property="og:description" content="【ノートの抜粋】"\>  
  \<meta property="og:image" content="【カバー画像のURL】"\>

* **リダイレクト/誘導ロジック**: ページに埋め込まれたJavaScriptが、ユーザーの環境（OS）を判別し、最適なアクションを実行する。  
  * **ネイティブアプリがインストール済みの場合**: カスタムURLスキーム（例: mynoteapp://notes/\<noteId\>）を使ってアプリを直接開き、該当ノートを表示する。  
  * **ネイティブアプリが未インストールの場合**: App StoreやGoogle Playのページへ誘導する。  
  * **デスクトップ環境の場合**: Webアプリケーション版のノート閲覧ページへ遷移させる。