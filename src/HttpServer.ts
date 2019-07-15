import { urlencoded, json } from 'body-parser'
import * as express from 'express'

export class HttpServer {
  service: ServiceInterface

  constructor(service: ServiceInterface) {
    this.service = service
  }

  async handleRequest(req: any, res: any) {
    // TODO: Validate request format?
    const response = await this.service.request(req.body as NaturalRightsRequest)
    res.json(response)
  }

  listen(port: number, host: string) {
    const app = express()
    app.use(urlencoded({ extended: true }))
    app.use(json())
    const router = express.Router()
    router.post('/', this.handleRequest.bind(this))
    app.use(router)
    return app.listen(port, host)
  }
}
