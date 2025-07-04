# **第10章: データ管理機能**

### **目次**

10.1. データエクスポート機能  
10.2. データインポート機能

### **10.1. データエクスポート機能**

#### **10.1.1. 要件**

登録ユーザーは、自身がアプリケーション内に保存した全ての個人データ（ノート、画像など）を、ダウンロード可能な単一のファイルとして一括で書き出す（エクスポートする）ことができる。

#### **10.1.2. 実装アーキテクチャ**

この機能は、クライアントからのリクエストに応じて起動するCallable Cloud Function (exportUserData) を用いて実装する。処理に時間がかかる可能性があるため、クライアントは関数の実行完了を待つのではなく、非同期で結果を受け取る仕組みを考慮する（例: 完了時にプッシュ通知やメールで通知）。

#### **10.1.3. プロセスフロー**

1. **リクエスト**: ユーザーがアプリケーションの設定画面などからデータのエクスポートを要求する。  
2. **関数呼び出し**: クライアントアプリはexportUserData Callable Functionを呼び出す。  
3. データ収集 (Cloud Function内):  
   a. 関数は、呼び出し元のユーザーのuidを検証する。  
   b. Firestoreのパス /users/{uid} 以下にある全てのドキュメントとサブコレクションを再帰的に取得する。  
   c. 取得したFirestoreデータを、構造化されたJSONファイル（例: firestore\_export.json）としてシリアライズする。  
   d. Cloud Storageのパス users/{uid}/ 以下にある全てのファイル（画像）をリストアップする。  
4. パッケージング (Cloud Function内):  
   a. 関数の実行環境の一時ディレクトリに、ZIPアーカイブを作成する。  
   b. 作成したJSONファイルと、Cloud Storageから取得した全ての画像ファイルをZIPアーカイブに追加する。  
5. ダウンロードリンクの生成 (Cloud Function内):  
   a. 完成したZIPファイルを、一時的な保管場所としてCloud Storageにアップロードする（例: /exports/{uid}/{timestamp}.zip）。  
   b. アップロードしたZIPファイルに対して、有効期限付きの署名付きURL（Signed URL）を生成する。  
6. **レスポンス**: 関数は、生成した署名付きURLをクライアントアプリに返す（または通知する）。  
7. **ダウンロード**: クライアントは、ユーザーにダウンロードリンクを提示する。ユーザーはこのリンクを通じて、自身の全データが含まれたZIPファイルをダウンロードする。

### **10.2. データインポート機能**

#### **10.2.1. 要件**

登録ユーザーは、以前にエクスポートした自身の個人データ（ZIPアーカイブ）を、アプリケーションに一括して取り込む（インポートする）ことができる。

#### **10.2.2. 実装アーキテクチャ**

この機能は、クライアントからのリクエストに応じて起動するCallable Cloud Function (importUserData) を用いて実装する。これも非同期処理として設計する。

#### **10.2.3. プロセスフロー**

1. **ファイル選択とアップロード**: ユーザーがインポート機能を選択し、エクスポート済みのZIPファイルを指定する。クライアントアプリは、ファイルを一時的な場所（例: /imports/{uid}/{timestamp}.zip）にアップロードする。  
2. **関数呼び出し**: アップロード完了後、クライアントはimportUserData関数を、アップロードしたファイルのパスを引数として呼び出す。  
3. 展開と解析 (Cloud Function内):  
   a. 関数は、指定されたパスからZIPファイルを自身の実行環境にダウンロードし、展開する。  
   b. 展開されたファイルの中から、firestore\_export.jsonを解析する。  
4. データ書き込み (Cloud Function内):  
   a. Firestoreへの書き込み: 関数は、JSONデータに基づき、/users/{uid}以下のパスにドキュメントとサブコレクションを書き込む。この際、後述のデータ競合解決戦略を適用する。  
   b. Cloud Storageへの書き込み: 関数は、展開された画像ファイルを、対応するCloud Storageのパス（/users/{uid}/...）にアップロードする。  
5. **クリーンアップと通知**: 処理完了後、一時的なZIPファイルを削除し、クライアントに処理完了を通知する。

#### **10.2.4. データ競合の解決戦略**

インポート時に、既存のデータとインポートするデータが競合する可能性があるため、以下の戦略を基本とする。

* **Firestoreドキュメント**:  
  * **タイムスタンプ比較**: lastUpdatedAtフィールドを比較し、より新しい方のデータでドキュメント全体を上書きする。これにより、意図しない古いデータでの上書きを防ぐ。  
  * **サブコレクション**: サブコレクション内の各ドキュメントについても同様の戦略を適用する。  
* **Cloud Storageファイル**:  
  * 既存のパスに同名のファイルがある場合は、インポートするファイルで上書きする。