import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/info')
  async getVideoInfo(@Query('url') url: string) {
    try {
      return await this.appService.getVideoInfo(url);
    } catch (error) {
      throw new HttpException(
        {
          status: 400,
          message: `Error processing video`,
          error: `Error processing video
        Possibly invalid URL or is a private video`,
        },
        HttpStatus.FORBIDDEN,
        {
          cause: error,
        },
      );
    }
  }

  @Get('/list/info')
  async getVideoListInfo(
    @Query('url') url: string,
    @Query('limit') limit: number,
  ) {
    try {
      return await this.appService.getPlaylistInfo(url, limit);
    } catch (error) {
      throw new HttpException(
        {
          status: 400,
          message: `Error processing playlist`,
          error: `Error processing playlist
        Possibly invalid URL or is a private playlist`,
        },
        HttpStatus.FORBIDDEN,
        {
          cause: error,
        },
      );
    }
  }

  @Get('download')
  async downloadVideo(@Query('url') url: string, @Res() response: Response) {
    try {
      const { stream, filename, contentType } =
        await this.appService.downloadVideo(url);

      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(filename)}"`,
      );
      response.setHeader('Content-Type', contentType);

      stream.pipe(response);

      stream.on('end', () => {
        response.end();
      });

      stream.on('error', (error) => {
        console.error('Stream error:', error);
        response.status(500).send('Error streaming video');
      });
    } catch (error) {
      throw new HttpException(
        {
          status: 400,
          message: `Error downloading video`,
          error: `Error downloading video
        Possibly invalid URL or is a private video`,
        },
        HttpStatus.FORBIDDEN,
        {
          cause: error,
        },
      );
    }
  }
}
