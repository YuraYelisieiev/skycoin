import { filter } from 'rxjs/operators';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { PriceService } from '../../../services/price.service';
import { SubscriptionLike } from 'rxjs';
import { BlockchainService } from '../../../services/blockchain.service';
import { AppService } from '../../../services/app.service';
import { BigNumber } from 'bignumber.js';
import { NetworkService } from '../../../services/network.service';
import { AppConfig } from '../../../app.config';
import { BalanceAndOutputsService } from '../../../services/wallet-operations/balance-and-outputs.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() headline: string;

  showPrice = !!AppConfig.priceApiId;
  addresses = [];
  current: number;
  highest: number;
  percentage: number;
  querying = true;
  hasPendingTxs: boolean;
  price: number;
  synchronized = true;
  balanceObtained = false;
  walletDownloadUrl = AppConfig.walletDownloadUrl;

  private subscriptionsGroup: SubscriptionLike[] = [];
  // This should be deleted. View the comment in the constructor.
  // private fetchVersionError: string;

  get loading() {
    return !this.current || !this.highest || this.current !== this.highest || !this.coins || this.coins === 'NaN' || !this.hours || this.hours === 'NaN' || !this.balanceObtained;
  }

  get coins() {
    let coins = new BigNumber('0');
    this.addresses.map(addr => coins = coins.plus(addr.coins));

    return coins.decimalPlaces(6).toString();
  }

  get hours() {
    let hours = new BigNumber('0');
    this.addresses.map(addr => hours = hours.plus(addr.hours));

    return hours.decimalPlaces(0).toString();
  }

  constructor(
    public appService: AppService,
    public networkService: NetworkService,
    private blockchainService: BlockchainService,
    private priceService: PriceService,
    private balanceAndOutputsService: BalanceAndOutputsService,
  ) { }

  ngOnInit() {
    this.subscriptionsGroup.push(this.blockchainService.progress.pipe(filter(response => !!response))
      .subscribe(response => {
        this.querying = false;
        this.highest = response.highestBlock;
        this.current = response.currentBlock;
        this.percentage = this.current && this.highest ? (this.current / this.highest) : 0;
        this.synchronized = response.synchronized;
      }));

    this.subscriptionsGroup.push(this.priceService.price.subscribe(price => this.price = price));

    this.subscriptionsGroup.push(this.balanceAndOutputsService.walletsWithBalance.subscribe(wallets => {
      this.addresses = [];
      const alreadyAddedAddresses = new Map<string, boolean>();

      wallets.forEach(wallet => {
        wallet.addresses.forEach(address => {
          if (!alreadyAddedAddresses.has(address.address)) {
            this.addresses.push(address);
            alreadyAddedAddresses.set(address.address, true);
          }
        });
      });
    }));

    this.subscriptionsGroup.push(this.balanceAndOutputsService.hasPendingTransactions.subscribe(hasPendingTxs => {
      this.hasPendingTxs = hasPendingTxs;
    }));

    this.subscriptionsGroup.push(this.balanceAndOutputsService.firstFullUpdateMade.subscribe(firstFullUpdateMade => {
      this.balanceObtained = firstFullUpdateMade;
    }));
  }

  ngOnDestroy() {
    this.subscriptionsGroup.forEach(sub => sub.unsubscribe());
  }
}
