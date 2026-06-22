declare module 'minecraft-launcher-core' {
  export class Client {
    constructor();
    launch(options: any): Promise<void>;
    on(event: string, callback: (data: any) => void): void;
  }
}
