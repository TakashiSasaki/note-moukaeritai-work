# **第6章: セキュリティ設計 (Security Rules)**

### **目次**

6.1. 基本原則  
6.2. Firestore Rules  
6.3. Storage Rules  
6.4. Cloud Functionsのセキュリティ

### **6.1. 基本原則**

本アプリケーションのセキュリティ設計は、「最小権限の原則」と「ユーザーデータ所有の原則」に基づいている。全てのデータアクセスはサーバーサイドで強制的に検証され、ユーザーは自身が所有するデータ、または明示的に共有が許可されたデータにのみアクセスできる。

### **6.2. Firestore Rules**

Firestoreへの全ての読み書き操作は、firestore.rulesに定義されたルールセットによって検証される。

* **基本方針**: 認証されたユーザーは、自身のユーザーIDに紐づくパス以下のデータにのみ読み書きを許可する。  
  // firestore.rules  
  rules\_version \= '2';

  service cloud.firestore {  
    match /databases/{database}/documents {

      // ユーザー自身のプライベートデータへのアクセス制御  
      match /users/{userId}/{documents=\*\*} {  
        allow read, write: if request.auth \!= null && request.auth.uid \== userId;  
      }

      // 公開ノート情報への読み取りアクセス制御  
      match /publicNotes/{noteId} {  
        allow read: if true; // 誰でも読み取り可能  
        allow write: if false; // クライアントからの直接書き込みは一切禁止  
      }  
    }  
  }

* **補足**: publicNotesコレクションへの書き込みは、信頼できるサーバー環境であるCloud Functionsからのみ実行されるため、クライアントからの直接書き込みは完全にブロックする。

### **6.3. Storage Rules**

Cloud Storageへの全てのファイル操作は、storage.rulesに定義されたルールセットによって検証される。

* **基本方針**: 認証されたユーザーは、自身のユーザーIDに紐づくフォルダ以下のファイルにのみ読み書きを許可する。  
  // storage.rules  
  rules\_version \= '2';

  service firebase.storage {  
    match /b/{bucket}/o {

      // ユーザー自身の画像ファイルへのアクセス制御  
      match /users/{userId}/{allPaths=\*\*} {  
        allow read, write: if request.auth \!= null && request.auth.uid \== userId;  
      }

      // エクスポート/インポート用の一時ファイルへの書き込み制御  
      // (パスを推測困難にし、Cloud Functions側で適切な権限管理を行う)  
      match /exports/{userId}/{fileName} {  
        allow write: if request.auth \!= null && request.auth.uid \== userId;  
      }  
      match /imports/{userId}/{fileName} {  
        allow write: if request.auth \!= null && request.auth.uid \== userId;  
      }  
    }  
  }

### **6.4. Cloud Functionsのセキュリティ**

* **Callable Functions**: 呼び出し元のユーザー認証情報 (context.auth) を常に検証し、リクエストが正当なユーザーから行われていることを確認する。  
* **トリガー関数**: 関数が操作するドキュメントパスやファイルパスからuserIdを抽出し、操作の正当性を検証する。  
* **Admin SDK**: Cloud Functions内部で使用されるAdmin SDKは、セキュリティルールをバイパスする特権を持つため、その使用は必要最小限に留め、ロジック内で厳格な権限チェックを行う。