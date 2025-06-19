# **第5章: バックエンドロジック (Cloud Functions)**

### **目次**

5.1. logAccess (Callable)  
5.2. maintainBacklinks (Firestore Trigger)  
5.3. cleanupDeletedEntry (Firestore Trigger)  
5.4. migrateUserData (Callable)  
5.5. viewNote (HTTP Trigger)  
5.6. syncPublicNote (Firestore Trigger)  
5.7. updateNoteStats (Firestore Trigger)  
5.8. updateStorageStats (Storage Trigger)  
5.9. exportUserData (Callable)  
5.10. importUserData (Callable)

### **5.1. logAccess (Callable Function)**

* **トリガー**: クライアントからの直接呼び出し  
* **目的**: アクセスログの記録  
* **処理**: クライアントからノートID、ログ種別、位置情報、各種クライアント情報を受け取り、サーバー側でIPアドレスを付加して完全なログとしてFirestoreに記録する。readログの場合はnoteReadStatusも更新する。

### **5.2. maintainBacklinks (Firestore Trigger)**

* **トリガー**: onWrite on /users/{userId}/notes/{noteId}/entries/{entryId}  
* **目的**: 双方向リンクの自動管理  
* **処理**: entriesドキュメントのlinksフィールドの変更を検知し、追加/削除されたリンクに応じて、リンク先のノートのbacklinksサブコレクションを更新する。

### **5.3. cleanupDeletedEntry (Firestore Trigger)**

* **トリガー**: onDelete on /users/{userId}/notes/{noteId}/entries/{entryId}  
* **目的**: 関連データの一括クリーンアップ  
* **処理**: エントリ削除時に、関連するCloud Storage上の画像ファイルと、Firestore上の被リンク情報を全て削除する。

### **5.4. migrateUserData (Callable Function)**

* **トリガー**: クライアントからの直接呼び出し  
* **目的**: 匿名アカウントから登録済みアカウントへのデータ移行  
* **処理**: 移行元と移行先のuidを元に、/users/{anonymous\_uid}以下の全データを/users/{permanent\_uid}以下にコピー/マージする。

### **5.5. viewNote (HTTP Trigger)**

* **トリガー**: Firebase Hostingからのリライト (/notes/\*)  
* **目的**: 共有URLアクセス時の動的ページ生成  
* **処理**: URLからnoteIdを取得し、publicNotesコレクションを検索。ノート情報を元にOGPメタタグを含むHTMLを動的に生成して返す。

### **5.6. syncPublicNote (Firestore Trigger)**

* **トリガー**: onWrite on /users/{userId}/notes/{noteId}  
* **目的**: 公開ノート情報(publicNotes)の同期  
* **処理**: ノートのisPublicフラグの変更を検知し、publicNotesコレクションに対応するドキュメントを作成、更新、または削除する。

### **5.7. updateNoteStats (Firestore Trigger)**

* **トリガー**: onWrite on /users/{userId}/notes/{noteId}  
* **目的**: ノート数の集計  
* **処理**: ノートの作成/削除に応じて、statistics/summaryドキュメントのnoteCountをアトミックに増減させる。

### **5.8. updateStorageStats (Storage Trigger)**

* **トリガー**: onFinalize, onDelete on Cloud Storage files  
* **目的**: 画像数と合計サイズの集計  
* **処理**: 画像ファイルのアップロード/削除に応じて、statistics/summaryドキュメントのimageCountとtotalImageSizeをアトミックに更新する。

### **5.9. exportUserData (Callable Function)**

* **トリガー**: クライアントからの直接呼び出し  
* **目的**: ユーザーの全データエクスポート  
* **処理**: ユーザーの全FirestoreデータとCloud Storageファイルを収集し、ZIPアーカイブを作成。一時的な署名付きURLを生成してクライアントに返す。

### **5.10. importUserData (Callable Function)**

* **トリガー**: クライアントからの直接呼び出し  
* **目的**: ユーザーデータのインポート  
* **処理**: クライアントからアップロードされたZIPファイルを展開し、内容をFirestoreとCloud Storageに書き込む。データ競合の解決戦略も含む。