# **第3章: データベース設計 (Cloud Firestore)**

### **目次**

3.1. トップレベルコレクション: users

* 3.1.1. users/{userId}/notes/{noteId} (ノート本体)  
* 3.1.2. users/{userId}/noteReadStatus/{noteId} (最終読み取り日時)  
* 3.1.3. users/{userId}/statistics/summary (統計情報)  
  3.2. トップレベルコレクション: publicNotes  
* 3.2.1. publicNotes/{noteId} (公開ノート用インデックス)

### **3.1. トップレベルコレクション: users**

全てのユーザーごとのプライベートなデータを格納する基点となるコレクション。ドキュメントIDにはFirebase Authenticationが発行するuidを使用する。

#### **3.1.1. users/{userId}/notes/{noteId} (ノート本体)**

個々のノートの本体となるドキュメント。noteIdにはUUIDv4などのグローバルに一意なIDを使用する。

* **フィールド:**  
  * title (String): ノートのタイトル  
  * createdAt (Timestamp): ノートの作成日時  
  * lastUpdatedAt (Timestamp): ノートの最終更新日時  
  * tags (Array, Optional): ノートに付与されたタグのリスト  
  * nfcTagId (String, Optional): 関連付けられたNFCタグのID  
  * qrCodeData (String, Optional): 関連付けられたQRコードのデータ  
  * isPublic (Boolean): 共有URLでの公開可否。デフォルトはfalse。  
  * publicPassword (String, Optional): 共有用のハッシュ化されたパスワード。  
* **サブコレクション:**  
  * **entries**: ノートへの時系列エントリを格納する。  
    * パス: .../notes/{noteId}/entries/{entryId}  
    * フィールド:  
      * text (String): エントリの本文  
      * timestamp (Timestamp): エントリの作成日時  
      * imageUrls (Array): 添付画像のURLリスト  
      * links (Array): 他のノートへの参照リンクのリスト  
  * **backlinks**: このノートへの被リンク情報を格納する。（Cloud Functionsで自動管理）  
    * パス: .../notes/{noteId}/backlinks/{linkingNoteId}  
    * フィールド:  
      * linkingEntryId (String): リンク元のエントリID  
      * timestamp (Timestamp): 被リンクが作成された日時  
  * **accessLogs**: このノートへのアクセス履歴を格納する。  
    * パス: .../notes/{noteId}/accessLogs/{logId}  
    * フィールド:  
      * type (String): "read" または "write"  
      * timestamp (Timestamp): アクセス日時  
      * userId (String): アクセスしたユーザーID  
      * ipAddress (String): アクセス元のIPアドレス  
      * userAgent (String, Optional): クライアントのユーザーエージェント  
      * location (Map): 位置情報 (latitude, longitude)  
      * networkInfo (Map, Optional): ネットワーク情報 (type, effectiveType)  
      * connectedWifiInfo (Map, Optional): 接続中のWi-Fi情報 (ssid, bssid)  
      * surroundingWifiAPs (Array, Optional): 周辺のWi-Fi APリスト

#### **3.1.2. users/{userId}/noteReadStatus/{noteId} (最終読み取り日時)**

読み取りログの記録頻度を制御するため、ユーザーごと・ノートごとの最終読み取り日時を管理する。

* **フィールド:**  
  * lastReadAt (Timestamp): このユーザーがこのノートを最後に読み取った日時

#### **3.1.3. users/{userId}/statistics/summary (統計情報)**

ユーザーのデータに関する集計情報を格納する単一のドキュメント。（Cloud Functionsで自動管理）

* **フィールド:**  
  * noteCount (Number): 所有ノートの総数  
  * imageCount (Number): 保存画像の総数  
  * totalImageSize (Number): 全画像ファイルの合計サイズ（バイト単位）

### **3.2. トップレベルコレクション: publicNotes**

共有URL機能のために、公開が許可されたノートのインデックス情報のみを格納する。

#### **3.2.1. publicNotes/{noteId} (公開ノート用インデックス)**

noteIdは、元となるusers/{userId}/notes/{noteId}のIDと同一。（Cloud Functionsで自動管理）

* **フィールド:**  
  * ownerUid (String): 所有者のユーザーID  
  * title (String): ノートのタイトル（OGP用）  
  * description (String): ノートの抜粋（OGP用）  
  * imageUrl (String): カバー画像のURL（OGP用）  
  * lastUpdatedAt (Timestamp): 最終更新日時  
  * passwordProtected (Boolean): パスワード保護の有無