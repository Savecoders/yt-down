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
  private readonly agent: ytdl.Agent;

  constructor() {
    try {
      const cookiesJson = process.env.YOUTUBE_COOKIE;
      const cookies = JSON.parse(cookiesJson);

      // Convert cookie array to ytdl-core format
      const ytdlCookies = cookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
      }));

      // Updated agent options to fix keepAlive error
      const agentOptions: any = {
        pipelining: 0, // Set pipelining to 0 instead of using keepAlive
        maxSockets: 100,
        timeout: 30000,
      };

      this.agent = ytdl.createAgent(ytdlCookies, agentOptions);
    } catch (error) {
      console.error('Error initializing YouTube agent:', error);
    }
  }
  getHello(): string {
    return 'Api is running';
  }

  private getRequestHeaders() {
    return {
      agent: this.agent,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        Connection: 'keep-alive',
      },
    };
  }

  private getDurationSecondsFormat(lengthSeconds: string): string {
    const durationInSeconds = parseInt(lengthSeconds);
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  async getVideoInfo(url: string): Promise<VideoInfo> {
    try {
      const info = await ytdl.getInfo(url, this.getRequestHeaders());

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

      const playlist = await ytpl(url, {
        limit: limit,
        gl: 'US',
        ...this.getRequestHeaders(),
      });

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
        requestOptions: this.getRequestHeaders(),
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
