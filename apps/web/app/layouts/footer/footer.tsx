import { FooterLayout as Footer } from './footer.layout';

function AppFooter() {
  return (
    <Footer>
      <Footer.Grid>
        <Footer.Column title="Dive deeper">
          <Footer.Link href="/support">Help Center</Footer.Link>
          <Footer.Link href="/changelog">Changelog</Footer.Link>
          <Footer.Link href="/news">News</Footer.Link>
          <Footer.Link withIcon href="https://leather.gitbook.io/">
            Developer Docs
          </Footer.Link>
        </Footer.Column>

        <Footer.Column title="Legal & policies">
          <Footer.Link href="/posts/privacy-policy">Privacy Policy</Footer.Link>
          <Footer.Link href="/posts/terms-of-service">Terms of Service</Footer.Link>
          <Footer.Link href="/support/security">Security</Footer.Link>
          <Footer.Link href="https://trustmachines.notion.site/Public-assets-00144dc5c69142199b00788ff61d721c">
            Brand assets
          </Footer.Link>
        </Footer.Column>

        <Footer.Column title="Stay in touch">
          <Footer.Link withIcon href="https://twitter.com/leatherbtc">
            X
          </Footer.Link>
          <Footer.Link withIcon href="https://www.youtube.com/@Leather-io">
            YouTube
          </Footer.Link>
          <Footer.Link withIcon href="https://github.com/leather-io">
            GitHub
          </Footer.Link>
        </Footer.Column>
      </Footer.Grid>

      <Footer.LegalText
        mt="space.08"
        product="A Trust Machines product"
        // Hard coding date as Cloudflare Workers renders new Date() as epoch
        // start time
        copyright="© Leather Wallet LLC"
      />
    </Footer>
  );
}
export { AppFooter as Footer };
