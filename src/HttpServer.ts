import { urlencoded, json } from 'body-parser'
import express = require('express')

export class HttpServer {
  service: ServiceInterface

  constructor(service: ServiceInterface) {
    this.service = service
  }

  listen(port: number, host: string) {
    const app = express()
    app.use(urlencoded({ extended: true }))
    app.use(json())
    const router = express.Router()
    router.post('/', async (req, res) => {
      // TODO: Validate request format?
      const response = await this.service.request(req.body as NaturalRightsRequest)
      res.json(response)
    })
    app.use(router)
    return app.listen(port, host)
  }
}
