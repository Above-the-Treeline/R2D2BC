/*
 * Copyright 2018-2020 DITA (AM Consulting LLC)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Developed on behalf of: Bokbasen AS (https://www.bokbasen.no)
 * Licensed to: Bokbasen AS and CAST under one or more contributor license agreements.
 */

import Store from "../store/Store";
import { Locator } from "./Locator";

export interface Metadata {
  title?: string;
  author?: string;
  identifier?: string;
  language?: string;
  modified?: string;
  rendition?: any;
}

export interface Link {
  //  The link destination
  href?: string;
  /// MIME type of resource.
  type?: string;
  /// Indicates the relationship between the resource and its containing collection.
  rel?: Array<string>;
  /// Indicates the height of the linked resource in pixels.
  height?: number;
  /// Indicates the width of the linked resource in pixels.
  width?: number;

  title?: string;
  /// Properties associated to the linked resource.
  // properties: Properties;
  /// Indicates the length of the linked resource in seconds.
  duration?: number;
  /// Indicates that the linked resource is a URI template.
  templated?: boolean;
  /// Indicate the bitrate for the link resource.
  bitrate?: number;

  //  The underlying nodes in a tree structure of Links
  children?: Array<Link>;
  //  The MediaOverlays associated to the resource of the Link
  // mediaOverlays?: MediaOverlays;

  contentLength?: number;
  contentWeight?: number;
}

export default class Publication {
  public readonly metadata: Metadata;
  public readonly links: Array<Link>;
  public readonly readingOrder: Array<Link>;
  public readonly resources: Array<Link>;
  public readonly tableOfContents: Array<Link>;
  public readonly landmarks: Array<Link>;
  public readonly pageList: Array<Link>;
  public readonly images: Array<Link>;
  public positions: Array<Locator>;

  private readonly manifestUrl: URL;

  public static async getManifest(
    manifestUrl: URL,
    store?: Store
  ): Promise<Publication> {
    const fetchManifest = async (): Promise<Publication> => {
      const response = await window.fetch(manifestUrl.href, {
        credentials: "same-origin",
      });
      const manifestJSON = await response.json();
      if (store) {
        await store.set("manifest", JSON.stringify(manifestJSON));
      }
      return new Publication(manifestJSON, manifestUrl);
    };

    const tryToUpdateManifestButIgnoreResult = async (): Promise<void> => {
      try {
        await fetchManifest();
      } catch (err) {
        // Ignore errors.
      }
      return new Promise<void>((resolve) => resolve());
    };

    // Respond immediately with the manifest from the store, if possible.
    if (store) {
      const manifestString = await store.get("manifest");
      if (manifestString) {
        // Kick off a fetch to update the store for next time,
        // but don't await it.
        tryToUpdateManifestButIgnoreResult();
        const manifestJSON = JSON.parse(manifestString);
        return new Publication(manifestJSON, manifestUrl);
      }
    }

    return fetchManifest();
  }

  public constructor(manifestJSON: any, manifestUrl: URL) {
    this.metadata = manifestJSON.metadata || {};
    this.links = manifestJSON.links || [];
    this.readingOrder = manifestJSON.spine || manifestJSON.readingOrder || [];
    this.resources = manifestJSON.resources || [];
    this.tableOfContents = manifestJSON.toc || [];
    this.landmarks = manifestJSON.landmarks || [];
    // this.pageList = manifestJSON.parse("page-list") || [];
    this.pageList = manifestJSON["page-list"] || manifestJSON.pageList || [];

    this.manifestUrl = manifestUrl;
  }

  public getStartLink(): Link | null {
    if (this.readingOrder.length > 0) {
      return this.readingOrder[0];
    }
    return null;
  }

  public getPreviousSpineItem(href: string): Link | null {
    const index = this.getSpineIndex(href);
    if (index !== null && index > 0) {
      return this.readingOrder[index - 1];
    }
    return null;
  }

  public getNextSpineItem(href: string): Link | null {
    const index = this.getSpineIndex(href);
    if (index !== null && index < this.readingOrder.length - 1) {
      return this.readingOrder[index + 1];
    }
    return null;
  }

  public getSpineItem(href: string): Link | null {
    const index = this.getSpineIndex(href);
    if (index !== null) {
      return this.readingOrder[index];
    }
    return null;
  }

  public getSpineIndex(href: string): number | null {
    return this.readingOrder.findIndex(
      (item) =>
        item.href && new URL(item.href, this.manifestUrl.href).href === href
    );
  }

  public getAbsoluteHref(href: string): string | null {
    return new URL(href, this.manifestUrl.href).href;
  }
  public getRelativeHref(href: string): string | null {
    const manifest = this.manifestUrl.href.replace("/manifest.json", ""); //new URL(this.manifestUrl.href, this.manifestUrl.href).href;
    var href = href.replace(manifest, "");
    if (href.charAt(0) === "/") {
      href = href.substring(1);
    }
    return href;
  }

  public getTOCItemAbsolute(href: string): Link | null {
    const absolute = this.getAbsoluteHref(href);
    const findItem = (href: string, links: Array<Link>): Link | null => {
      for (let index = 0; index < links.length; index++) {
        const item = links[index];
        if (item.href) {
          const hrefAbsolutre =
            item.href.indexOf("#") !== -1
              ? item.href.slice(0, item.href.indexOf("#"))
              : item.href;
          const itemUrl = new URL(hrefAbsolutre, this.manifestUrl.href).href;
          if (itemUrl === href) {
            return item;
          }
        }
        if (item.children) {
          const childItem = findItem(href, item.children);
          if (childItem !== null) {
            return childItem;
          }
        }
      }
      return null;
    };
    let link = findItem(absolute, this.tableOfContents);
    if (link === null) {
      link = findItem(absolute, this.readingOrder);
    }
    return link;
  }

  public getTOCItem(href: string): Link | null {
    const findItem = (href: string, links: Array<Link>): Link | null => {
      for (let index = 0; index < links.length; index++) {
        const item = links[index];
        if (item.href) {
          const itemUrl = new URL(item.href, this.manifestUrl.href).href;
          if (itemUrl === href) {
            return item;
          }
        }
        if (item.children) {
          const childItem = findItem(href, item.children);
          if (childItem !== null) {
            return childItem;
          }
        }
      }
      return null;
    };
    let link = findItem(href, this.tableOfContents);
    if (link === null) {
      link = findItem(href, this.readingOrder);
    }
    if (link === null) {
      if (href.indexOf("#") !== -1) {
        const newResource = href.slice(0, href.indexOf("#"));
        link = findItem(newResource, this.tableOfContents);
        if (link === null) {
          link = findItem(newResource, this.readingOrder);
        }
      }
    }
    return link;
  }

  /**
   * positionsByHref
   */
  public positionsByHref(href: string) {
    return this.positions.filter((el: Locator) => el.href === decodeURI(href));
  }

  /**
   * Fetches the contents to build up the positions manually,
   * at least for fluid layout pubs
   */
  async autoGeneratePositions() {
    let startPosition = 0;
    let totalContentLength = 0;
    const positions = [];

    /**
     * For each item in the reading order, get its length and calculate
     * the number of positions in it, then add them all up into the totals.
     */
    const promises = this.readingOrder.map(async (link, index) => {
      // if it is fixed layout, there is no need to fetch, each item is
      // just a single page.
      // @aferditamuriqi is this comment correct?
      if (this.metadata.rendition?.layout === "fixed") {
        const locator: Locator = {
          href: link.href,
          locations: {
            progression: 0,
            position: startPosition + 1,
          },
          type: link.type,
        };
        positions.push(locator);
        startPosition = startPosition + 1;
      } else {
        const href = this.getAbsoluteHref(link.href);
        // Are we fetching every item in the readingOrder to generate positions?
        // maybe in the future this can be done in the background?
        const result = await fetch(href);
        const length = (await result.blob()).size;
        link.contentLength = length;
        totalContentLength += length;
        const positionLength = 1024;
        const positionCount = Math.max(1, Math.ceil(length / positionLength));
        Array.from(Array(positionCount).keys()).forEach((_, position) => {
          const locator: Locator = {
            href: link.href,
            locations: {
              progression: position / positionCount,
              position: startPosition + (position + 1),
            },
            type: link.type,
          };
          positions.push(locator);
        });
        startPosition = startPosition + positionCount;
      }

      // If we are on the last item...
      if (index + 1 === this.readingOrder.length) {
        // for non fixed books, build up a dictionary of all the weights
        // I am going to move this outside the map on readingOrder
        // if (publication.metadata.rendition?.layout !== "fixed") {
        //   publication.readingOrder.map(async (link) => {
        //     link.contentWeight = (100 / totalContentLength) * link.contentLength;
        //     weight[link.href] = link.contentWeight;
        //   });
        // }

        // @aferditamuriqi what exactly does this do?
        positions.map((locator, _index) => {
          let resource = positions.filter(
            (el: Locator) => el.href === decodeURI(locator.href)
          );
          let positionIndex = Math.ceil(
            locator.locations.progression * (resource.length - 1)
          );
          locator.locations.totalProgression =
            (locator.locations.position - 1) / positions.length;
          locator.locations.remainingPositions = Math.abs(
            positionIndex - (resource.length - 1)
          );
          locator.locations.totalRemainingPositions = Math.abs(
            locator.locations.position - 1 - (positions.length - 1)
          );
        });
        this.positions = positions;
      }
    });

    // update the link.contentWeight to be a portion of the total and
    // build up a map of link weights for non fixed layout publications
    // @aferditamuriqi but what is the "weight" object ultimately used for?
    const weight = {};
    if (this.metadata.rendition?.layout !== "fixed") {
      this.readingOrder.forEach((link) => {
        // I don't totally know what this formula is saying haha, maybe we can
        // add a comment
        link.contentWeight = (100 / totalContentLength) * link.contentLength;
        weight[link.href] = link.contentWeight;
      });
    }

    // we need to wait for all of them to complete, meaning everything has bee
    // fetched and counted
    await Promise.all(promises);
  }

  /**
   * Fetches the positions from a given service href
   */
  async fetchPositionsFromService(href: string) {
    const result = await fetch(href);
    const content = await result.json();
    this.positions = content.positions;
  }

  /**
   * Fetches weights from a given service href
   */
  async fetchWeightsFromService(href: string) {
    if (this.metadata.rendition?.layout === "fixed") {
      console.warn(
        "Not fetching weights from service for fixed layout publication."
      );
      return;
    }
    const result = await fetch(href);
    const weights = await result.json();
    this.readingOrder.forEach((link) => {
      link.contentWeight = weights[link.href];
    });
  }
}
