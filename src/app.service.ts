import { Injectable } from '@nestjs/common';
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
    const info = await ytdl.getInfo(url);
    const duration = this.getDurationSecondsFormat(
      info.videoDetails.lengthSeconds,
    );
    return {
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails[0].url,
      duration: duration,
      url: url,
    };
  }

  // ...existing code...

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
}
