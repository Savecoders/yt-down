import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as ytdl from '@distube/ytdl-core';
import * as ytpl from '@distube/ytpl';
export interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: string;
  url: string;
}

@Injectable()
export class AppService {
  getHello(): string {
    return 'Api is running';
  }

  private getDurationSecondsFormat(lengthSeconds: string): string {
    const durationInSeconds = parseInt(lengthSeconds);
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  async getVideoInfo(url: string): Promise<VideoInfo> {
    try {
      const info = await ytdl.getInfo(url, {
        requestOptions: {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
      });

      const duration = this.getDurationSecondsFormat(
        info.videoDetails.lengthSeconds,
      );
      return {
        title: info.videoDetails.title,
        thumbnail: info.videoDetails.thumbnails[0].url,
        duration: duration,
        url: url,
      };
    } catch (error) {
      this.handleYoutubeError(error);
    }
  }

  async getPlaylistInfo(url: string, limit: number): Promise<VideoInfo[]> {
    try {
      limit = limit || 4;

      if (!url) {
        throw new Error(
          'Invalid playlist URL. Please provide a URL containing a playlist ID',
        );
      }

      const playlist = await ytpl(url, { limit: limit, gl: 'US' });

      return Promise.all(
        playlist.items.map(async (item) => {
          const duration = this.getDurationSecondsFormat(item.duration);
          return {
            title: item.title,
            thumbnail: item.thumbnail,
            duration: duration,
            url: item.url,
          };
        }),
      );
    } catch (error) {
      throw new Error(`Error getting playlist info: ${error.message}`);
    }
  }

  async downloadVideo(url: string) {
    try {
      const info = await ytdl.getBasicInfo(url);
      const videoStream = ytdl(url, {
        quality: 'highest',
        filter: 'audioandvideo',
      });

      // Return both the stream and video info
      return {
        stream: videoStream,
        filename: `${info.videoDetails.title}.mp4`,
        contentType: 'video/mp4',
      };
    } catch (error) {
      throw new Error(`Error downloading video: ${error.message}`);
    }
  }
  private handleYoutubeError(error: any): never {
    if (error.message.includes('Sign in to confirm')) {
      throw new HttpException(
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          error: 'YouTube Rate Limit',
          message:
            'YouTube has detected unusual traffic. Please try again later or use a different IP address.',
          details: error.message,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    throw new HttpException(
      {
        status: HttpStatus.BAD_REQUEST,
        error: 'YouTube Error',
        message: error.message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
