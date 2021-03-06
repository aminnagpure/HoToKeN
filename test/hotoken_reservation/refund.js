const {expect} = require('chai')
const HotokenReservation = artifacts.require('./HotokenReservation')

contract('HotokenReservation', function(accounts) {
  describe('refund Ether', function() {
    let h
    const owner = accounts[0]
    const user1 = accounts[1]

    beforeEach(async function() {
      h = await HotokenReservation.new()

      await h.setPause(false)
      await h.addToWhitelist(user1)
      await h.setMinimumSold(1)
    })

    it('should not be able to refund if reservation is paused', async function() {
      await h.setConversionToUSDCentsRate(45000) // 1ETH = $450.00

      let amount = web3.toWei(2, 'ether')

      await h.sendTransaction({from: user1, value: amount})

      await h.setPause(true)
      await h.setSaleFinished(true)

      try {
        await h.refund({from: user1})
        expect.fail(true, false, 'Operation should be reverted')
      } catch (e) {
        expect(e.toString()).to.be.include('revert')
      }
    })

    it('should not be able to refund if sale is not finished', async function() {
      await h.setConversionToUSDCentsRate(45000) // 1ETH = $450.00

      let amount = web3.toWei(2, 'ether')

      await h.sendTransaction({from: user1, value: amount})

      await h.setSaleFinished(false)

      try {
        await h.refund({from: user1})
        expect.fail(true, false, 'Operation should be reverted')
      } catch (e) {
        expect(e.toString()).to.be.include('revert')
      }
    })

    it('owner should not be able to refund', async function() {
      await h.setConversionToUSDCentsRate(45000) // 1ETH = $450.00

      let amount = web3.toWei(2, 'ether')

      await h.sendTransaction({from: user1, value: amount})

      await h.setSaleFinished(false)

      try {
        await h.refund({from: owner})
        expect.fail(true, false, 'Operation should be reverted')
      } catch (e) {
        expect(e.toString()).to.be.include('revert')
      }
    })

    it('should not be able to refund if sold amount is not reached minimum', async function() {
      await h.setMinimumSold(1 * 10 ** 16)

      await h.setConversionToUSDCentsRate(45000) // 1ETH = $450.00

      let amount = web3.toWei(2, 'ether')

      await h.sendTransaction({from: user1, value: amount})

      await h.setSaleFinished(true)

      try {
        await h.refund({from: user1})
        expect.fail(true, false, 'Operation should be reverted')
      } catch (e) {
        expect(e.toString()).to.be.include('revert')
      }
    })

    it('should not be able to refund if not in the whitelist', async function() {
      const h = await HotokenReservation.deployed()
      const owner = accounts[0]
      const user1 = accounts[1]

      await h.removeFromWhiteList(user1)

      await h.setMinimumSold(0)
      await h.setSaleFinished(true)

      try {
        await h.refund({from: user1})
        expect.fail(true, false, 'Operation should be reverted')
      } catch (e) {
        expect(e.toString()).to.be.include('revert')
      }
    })

    it('should not be able to refund if not exist in the ledger', async function() {
      await h.setConversionToUSDCentsRate(45000) // 1ETH = $450.00

      await h.setSaleFinished(true)

      try {
        await h.refund({from: user1})
        expect.fail(true, false, 'Operation should be reverted')
      } catch (e) {
        expect(e.toString()).to.be.include('revert')
      }
    })
  })
})

contract('HotokenReservation', function(accounts) {
  describe('refund Ether', function() {
    it('should be able to refund', async function() {
      const h = await HotokenReservation.deployed()
      const owner = accounts[0]
      const user1 = accounts[1]

      await h.setPause(false)
      await h.addToWhitelist(user1)
      await h.setMinimumSold(1 * 10 ** 6)

      await h.setConversionToUSDCentsRate(45000) // 1ETH = $450.00

      let amount = web3.toWei(2, 'ether')

      await h.sendTransaction({from: user1, value: amount})
      await h.setSaleFinished(true)

      const user1BalanceBefore = (await web3.eth.getBalance(user1)).toNumber()
      const user1RefundAmount = (await h.ethAmount.call(user1)).toNumber()
      const tx = await h.refund({from: user1})
      const user1BalanceAfter = (await web3.eth.getBalance(user1)).toNumber()

      expect(user1BalanceAfter).to.be.above(user1BalanceBefore)

      // test event RefundTransfer
      expect(tx.logs).to.be.ok
      expect(tx.logs[0].event).to.be.equal('RefundTransfer')
      expect(tx.logs[0].args._backer).to.be.equal(user1)
      expect(tx.logs[0].args._amount.toNumber()).to.be.equal(user1RefundAmount)
    })
  })
})

contract('HotokenReservation', function(accounts) {
  describe('refund', function() {
    it('should remove refunder balance',async function() {
      const user1 = accounts[1]
      const h = await HotokenReservation.deployed()
      await h.setPause(false)
      await h.addToWhitelist(user1)
      await h.setMinimumSold(1 * 10 ** 6)
      await h.setConversionToUSDCentsRate(45000) // 1ETH = $450.00
      await h.sendTransaction({from: user1, value: 1 * 10 ** 18})
      await h.setSaleFinished(true)

      await h.refund({from: user1})

      const balance = await h.balanceOf(user1)
      expect(balance.toNumber()).to.be.equal(0)
    })
  })
})

contract('HotokenReservation', function(accounts) {
  describe('refund', function() {
    it('should remove only balance that comes from ETH directly', async function() {
      const user1 = accounts[1]
      const h = await HotokenReservation.deployed()
      await h.setPause(false)
      await h.addToWhitelist(user1)
      await h.setMinimumSold(1 * 10 ** 6)
      await h.setConversionToUSDCentsRate(45000) // 1ETH = $450.00
      await h.sendTransaction({from: user1, value: 1 * 10 ** 18})
      await h.addToLedgerManual(
        user1, 'BTC', 2000, 200000, 1100000, 0, 20000*10**18
      ) // Buy $2000 using BTC
      await h.setSaleFinished(true)

      await h.refund({from: user1})

      const balance = await h.balanceOf(user1)
      expect(balance.toNumber()).to.be.equal(20000*10**18)
    })
  })
})

contract('HotokenReservation', function(accounts) {
  describe('refund', function() {
    it('should reset direct-ETH amount of the refunder to zero', async function() {
      const user1 = accounts[1]
      const h = await HotokenReservation.deployed()
      await h.setPause(false)
      await h.addToWhitelist(user1)
      await h.setMinimumSold(1 * 10 ** 6)
      await h.setConversionToUSDCentsRate(45000) // 1ETH = $450.00
      await h.sendTransaction({from: user1, value: 1 * 10 ** 18})
      await h.addToLedgerManual(
        user1, 'BTC', 2000, 200000, 1100000, 0, 20000*10**18
      ) // Buy $2000 using BTC
      await h.setSaleFinished(true)

      await h.refund({from: user1})

      const tokens = await h.directEthTokens.call(user1)
      expect(tokens.toNumber()).to.be.equal(0)
    })
  })
})
