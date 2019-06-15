export class HttpServer {
  service: ServiceInterface

  constructor(service: ServiceInterface) {
    this.service = service
  }

  listen(port: number, host = '127.0.0.1') {}
}
